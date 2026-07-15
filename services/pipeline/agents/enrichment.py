"""
Enrichment Agent — Step 5.
Läuft täglich 07:00.

Ablauf pro Firma:
  1. Website-URL finden (Pattern-Suche via httpx HEAD)
  2. Website-Text scrapen (httpx GET + BeautifulSoup)
  3. Claude Haiku extrahiert strukturierte Felder (JSON-only)
  4. Felder in enrichment-Tabelle schreiben, Status → angereichert
  5. Firmen ohne Website → Minimal-Enrichment mit Konfidenz C

Konfidenz: A = amtlich · B = Web-gescrapt · C = abgeleitet/leer
"""
import logging
import os
import re
import json
import time
import unicodedata
from typing import Optional

import httpx
from anthropic import Anthropic

from db import get_db, upsert_enrichment, update_company_status

log = logging.getLogger(__name__)

_anthropic = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; DealOriginationBot/1.0; +https://10xgroup.ch)",
    "Accept-Language": "de-CH,de;q=0.9,fr;q=0.8",
}
TIMEOUT   = httpx.Timeout(10.0)
MAX_CHARS = 6000   # truncate scraped content before sending to LLM


EXTRACT_SYSTEM = """Du bist ein Daten-Extraktions-Agent für M&A-Screening.
Analysiere den Website-Text eines Schweizer KMU und extrahiere genau diese Felder als JSON.
Gib NUR valides JSON zurück — kein Markdown, keine Erklärung.

{
  "inhaber_name": "<vollständiger Name des Inhabers/GF, oder null>",
  "inhaber_alter": <geschätztes Alter als Zahl, oder null>,
  "inhaber_alter_conf": "<A|B|C>",
  "kein_nachfolger": <true wenn kein Nachfolger erkennbar, false wenn einer genannt, null wenn unklar>,
  "kein_nachfolger_conf": "<A|B|C>",
  "personenname_in_name": <true wenn Personenname im Firmennamen, false sonst>,
  "team_seite_tiefe": <0.0–1.0, wie ausführlich ist die Team-/Über-uns-Seite>,
  "wiederkehr_signal": <0.0–1.0, wie stark sind Anzeichen für wiederkehrenden Umsatz>,
  "kundendiversifikation": <0.0–1.0, Einschätzung Kundendiversifikation; 1.0=sehr diversifiziert>,
  "web_last_update_years": <geschätzte Jahre seit letztem inhaltlichen Update, oder null>,
  "mitarbeiter_est": <Schätzung Mitarbeiterzahl als Zahl, oder null>
}

Konfidenz: A=explizit auf Website, B=klar ableitbar, C=geschätzt.
Inhaberalter: Wenn Jahrgang/Geburtsjahr erwähnt, berechne das Alter für 2026.
Personenname im Firmennamen: prüfe Firmenname auf Personennamen (z.B. "Müller AG", "Hans Bauer GmbH").
Firmennamen wird als user_firmennamen mitgeliefert."""


def _slugify(name: str) -> str:
    """Convert company name to likely domain slug."""
    name = name.lower()
    name = unicodedata.normalize("NFKD", name)
    name = name.encode("ascii", "ignore").decode("ascii")
    # Remove legal form suffixes
    for suffix in [" ag", " gmbh", " sarl", " sa", " sàrl", " gmbh & co kg",
                   " in liquidation", " in auflösung", " inh.", " & co."]:
        name = name.replace(suffix, "")
    name = re.sub(r"[^a-z0-9\s-]", "", name)
    name = re.sub(r"\s+", "-", name.strip())
    name = re.sub(r"-+", "-", name).strip("-")
    return name[:40]


def _find_website(name: str, client: httpx.Client) -> Optional[str]:
    """Try common URL patterns; return first that resolves with 2xx/3xx."""
    slug = _slugify(name)
    if not slug or len(slug) < 3:
        return None

    candidates = [
        f"https://www.{slug}.ch",
        f"https://{slug}.ch",
        f"https://www.{slug}.com",
    ]
    for url in candidates:
        try:
            r = client.head(url, follow_redirects=True, timeout=5)
            if r.status_code < 400:
                return str(r.url)
        except Exception:
            pass
    return None


def _scrape_text(url: str, client: httpx.Client) -> str:
    """Fetch page, strip tags, return clean text (max MAX_CHARS chars)."""
    try:
        r = client.get(url, follow_redirects=True, timeout=TIMEOUT)
        r.raise_for_status()
    except Exception as e:
        log.debug(f"Scrape failed {url}: {e}")
        return ""

    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(r.text, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "head"]):
            tag.decompose()
        text = soup.get_text(separator=" ", strip=True)
        text = re.sub(r"\s{2,}", " ", text)
        return text[:MAX_CHARS]
    except Exception:
        return r.text[:MAX_CHARS]


def _extract_with_llm(company_name: str, website_text: str) -> dict:
    """Ask Claude Haiku to extract enrichment fields from website text."""
    user_msg = (
        f"Firmenname: {company_name}\n\n"
        f"Website-Inhalt:\n{website_text}"
    )
    try:
        resp = _anthropic.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=512,
            system=EXTRACT_SYSTEM,
            messages=[{"role": "user", "content": user_msg}],
        )
        raw = resp.content[0].text.strip()
        raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.MULTILINE)
        raw = re.sub(r"```\s*$", "", raw, flags=re.MULTILINE)
        return json.loads(raw)
    except Exception as e:
        log.warning(f"LLM extraction failed for {company_name}: {e}")
        return {}


def _minimal_enrichment(company: dict) -> dict:
    """Fallback when no website found — derive what we can from company data."""
    name = company.get("name", "")
    # Detect Personenname in Firmennamen (simple heuristic)
    common_first = {"hans", "peter", "thomas", "daniel", "martin", "beat",
                    "markus", "andreas", "christian", "stefan", "reto",
                    "urs", "kurt", "heinz", "walter", "ernst"}
    words = set(name.lower().split())
    person_in_name = bool(words & common_first) or bool(re.search(r"\b[A-Z][a-z]+ [A-Z][a-z]+\b", name))

    return {
        "personenname_in_name": person_in_name,
        # team_seite_tiefe intentionally omitted — no web evidence → gate stays 'offen'
        "wiederkehr_signal":    None,
        "kundendiversifikation": None,
    }


def enrich_company(company: dict, client: httpx.Client) -> bool:
    """
    Enrich a single company. Returns True if enrichment was written.
    """
    cid  = company["id"]
    name = company.get("name", "")

    # Preserve auf_plattform=True for broker listings (already set by radar)
    from db import get_enrichment as _get_enrich
    existing = _get_enrich(cid) or {}
    keep_auf_plattform = existing.get("auf_plattform", False)

    # For broker listings (auf_plattform already True), skip website guessing:
    # names like "Zürich Nord: Erfolgreiche Sportsbar" won't produce valid domains.
    if keep_auf_plattform:
        fields = _minimal_enrichment(company)
    else:
        website_url = _find_website(name, client)
        if website_url:
            log.info(f"  Website: {website_url}")
            text = _scrape_text(website_url, client)
            fields = _extract_with_llm(name, text) if text else _minimal_enrichment(company)
        else:
            log.debug(f"  Kein Website für: {name}")
            fields = _minimal_enrichment(company)

    # Preserve existing auf_plattform value (True=broker, False=latent)
    fields["auf_plattform"] = keep_auf_plattform

    upsert_enrichment(cid, fields)
    update_company_status(cid, "angereichert")
    return True


def run(limit: int = 500, statuses: list[str] | None = None) -> None:
    log.info("Enrichment: Start")

    db = get_db()
    target_statuses = statuses or ["neu", "bewertet"]

    companies: list[dict] = []
    for st in target_statuses:
        res = db.table("companies").select("*").eq("status", st).limit(limit).execute()
        companies.extend(res.data or [])

    # De-dup by id
    seen: set[str] = set()
    companies = [c for c in companies if not (c["id"] in seen or seen.add(c["id"]))]
    companies = companies[:limit]

    log.info(f"Enrichment: {len(companies)} Firmen zu anreichern")

    ok = 0
    with httpx.Client(headers=HEADERS, follow_redirects=True) as client:
        for i, company in enumerate(companies, 1):
            try:
                enrich_company(company, client)
                ok += 1
                log.info(f"[{i}/{len(companies)}] {company['name']}")
            except Exception as e:
                log.warning(f"[{i}/{len(companies)}] Fehler bei {company['name']}: {e}")
            # Polite delay after every LLM call
            time.sleep(0.3)

    log.info(f"Enrichment: {ok}/{len(companies)} erfolgreich")
