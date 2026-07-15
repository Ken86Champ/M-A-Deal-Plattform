"""
Connector: companymarket.ch — Schweizer Nachfolgeplattform.

~280 Inserate, alle Schweizer Firmen, mit Kanton + Branche auf Listing-Seite.
Seiten: https://www.companymarket.ch?page=N (1..max)

Scraping-Strategie:
  - requests.Session mit Browser-Headers
  - BeautifulSoup für Listing-Cards + Detail-Pages
  - Detail-Page: Preis, Umsatz, Mitarbeiter, Beschreibung
"""
import logging
import re
import time

import httpx
from bs4 import BeautifulSoup

log = logging.getLogger(__name__)

BASE_URL  = "https://www.companymarket.ch"
LIST_URL  = BASE_URL                   # ?page=N
SLEEP     = 1.2                        # zwischen Requests
MAX_PAGES = 50                         # Obergrenze

CANTON_CODES: dict[str, str] = {
    # Deutsch
    "Zürich": "ZH", "Bern": "BE", "Luzern": "LU", "Uri": "UR",
    "Schwyz": "SZ", "Obwalden": "OW", "Nidwalden": "NW", "Glarus": "GL",
    "Zug": "ZG", "Freiburg": "FR", "Solothurn": "SO", "Basel-Stadt": "BS",
    "Basel-Landschaft": "BL", "Schaffhausen": "SH",
    "Appenzell Ausserrhoden": "AR", "Appenzell Innerrhoden": "AI",
    "St. Gallen": "SG", "Sankt Gallen": "SG", "St Gallen": "SG",
    "Graubünden": "GR", "Aargau": "AG",
    "Thurgau": "TG", "Tessin": "TI", "Waadt": "VD", "Wallis": "VS",
    "Neuenburg": "NE", "Genf": "GE", "Jura": "JU",
    # Französisch
    "Genève": "GE", "Vaud": "VD", "Valais": "VS", "Neuchâtel": "NE",
    "Fribourg": "FR", "Grisons": "GR", "Saint-Gall": "SG",
    "Thurgovie": "TG", "Tessin": "TI", "Uri": "UR", "Berne": "BE",
    "Lucerne": "LU", "Argovie": "AG", "Zurich": "ZH",
    # Kantoncodes direkt (falls site schon den Code zeigt)
    "ZH": "ZH", "BE": "BE", "LU": "LU", "UR": "UR", "SZ": "SZ",
    "OW": "OW", "NW": "NW", "GL": "GL", "ZG": "ZG", "FR": "FR",
    "SO": "SO", "BS": "BS", "BL": "BL", "SH": "SH", "AR": "AR",
    "AI": "AI", "SG": "SG", "GR": "GR", "AG": "AG", "TG": "TG",
    "TI": "TI", "VD": "VD", "VS": "VS", "NE": "NE", "GE": "GE", "JU": "JU",
}

# Validierte Schweizer Kantoncodes — Fallback nur akzeptieren wenn Ergebnis hier enthalten
VALID_CANTONS = set(CANTON_CODES.values())

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/125.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "de-CH,de;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


def _get(client: httpx.Client, url: str) -> BeautifulSoup | None:
    try:
        r = client.get(url, headers=HEADERS, follow_redirects=True, timeout=20)
        if r.status_code != 200:
            log.warning(f"companymarket: {r.status_code} für {url}")
            return None
        # Encoding explizit setzen — companymarket gibt manchmal falschen charset-Header
        if r.encoding and r.encoding.lower() in ('iso-8859-1', 'latin-1', 'windows-1252'):
            r.encoding = 'utf-8'
        return BeautifulSoup(r.text, "html.parser")
    except Exception as e:
        log.warning(f"companymarket: Fehler bei {url}: {e}")
        return None


def _parse_chf(text: str) -> int | None:
    """'CHF 1.2 Mio.' → 1_200_000; '450k' → 450_000; None wenn unklar."""
    t = text.replace("’", "").replace("'", "").replace(",", ".")
    m = re.search(r"([\d.]+)\s*(?:Mio|mio|M)\b", t, re.IGNORECASE)
    if m:
        return int(float(m.group(1)) * 1_000_000)
    m = re.search(r"([\d.]+)\s*(?:TCHF|Tsd|k)\b", t, re.IGNORECASE)
    if m:
        return int(float(m.group(1)) * 1_000)
    m = re.search(r"([\d.]+)\s*(?:CHF|Fr\.?)?\b", t)
    if m:
        v = float(m.group(1))
        if v > 10_000:
            return int(v)
    return None


def _parse_mitarbeiter(text: str) -> int | None:
    m = re.search(r"(\d+)", text.replace(",", "").replace("'", ""))
    return int(m.group(1)) if m else None


def _detail(client: httpx.Client, url: str) -> dict:
    """Fetcht Detail-Seite, extrahiert Finanzkennzahlen + Beschreibung."""
    soup = _get(client, url)
    if not soup:
        return {}

    result: dict = {}

    # Beschreibung aus dem ersten langen Absatz
    content = soup.find("div", class_=re.compile("listing.*(desc|content|body)", re.I))
    if content:
        paras = [p.get_text(" ", strip=True) for p in content.find_all("p")]
        result["description"] = " ".join(paras)[:2000] if paras else None

    # Tabelle mit Kennzahlen (Key-Value rows)
    for row in soup.find_all("tr"):
        cells = row.find_all(["th", "td"])
        if len(cells) < 2:
            continue
        key   = cells[0].get_text(strip=True).lower()
        value = cells[1].get_text(" ", strip=True)

        if "umsatz" in key:
            result["umsatz_est_chf"] = _parse_chf(value)
        elif "ebitda" in key:
            result["ebitda_raw"] = value
        elif "mitarbeiter" in key or "beschäftigte" in key:
            result["mitarbeiter_est"] = _parse_mitarbeiter(value)
        elif "preis" in key or "kaufpreis" in key:
            result["kaufpreis_raw"] = value

    return result


def _parse_listing_page(soup: BeautifulSoup, known: set[str]) -> list[dict]:
    """Extrahiert alle Listing-Cards von einer Seite."""
    listings: list[dict] = []

    # Alle Listing-Links — absolute oder relative /listing/-URLs
    seen_urls: set[str] = set()
    for a in soup.find_all("a", href=re.compile(r"/listing/")):
        if "listing__image" in (a.get("class") or []):
            continue
        if "details" in (a.get("class") or []):
            continue

        href = a["href"]
        url  = href if href.startswith("http") else BASE_URL + href

        # Titel: bevorzuge title-Attribut (sauber), Fallback auf ersten Text-Knoten
        title = (a.get("title") or "").strip()
        if not title:
            # Nur direkten Text, keine verschachtelten Duplikate
            direct = " ".join(t.strip() for t in a.strings if t.strip())
            # Dedupliziere: wenn erste Hälfte == zweite Hälfte
            half = len(direct) // 2
            if half > 10 and direct[:half].strip() == direct[half:].strip():
                direct = direct[:half].strip()
            title = direct[:200]

        if not title or url in seen_urls or url in known:
            continue
        seen_urls.add(url)

        # Branche + Kanton — versuche verschiedene HTML-Patterns
        parent = a.find_parent(["article", "div", "li"])
        canton = branche = None
        if parent:
            # Pattern 1: <a title="Kanton"><b>ZH</b></a>
            for sibling in parent.find_all("a", title=True):
                t   = sibling.get("title", "")
                b   = sibling.find("b")
                val = (b.get_text(strip=True) if b else sibling.get_text(strip=True)).strip()
                if t == "Kanton":
                    mapped = CANTON_CODES.get(val)
                    if not mapped:
                        candidate = val[:2].upper()
                        mapped = candidate if candidate in VALID_CANTONS else None
                    canton = mapped
                elif t == "Branche":
                    branche = val
            # Pattern 2: data-canton / data-category attributes
            if not canton:
                canton_val = parent.get("data-canton") or parent.get("data-region")
                if canton_val:
                    canton = CANTON_CODES.get(canton_val, canton_val[:2].upper())

        listings.append({
            "name":         title[:200],
            "canton":       canton,
            "branche":      branche,
            "external_ref": url,
        })

    return listings


def scan(known_external_refs: set[str] | None = None) -> list[dict]:
    """
    Scannt alle Seiten von companymarket.ch.
    known_external_refs: bereits bekannte Listing-URLs → werden übersprungen.
    Returns Liste von Company-Dicts mit origination='listed'.
    """
    known   = known_external_refs or set()
    results: list[dict] = []

    with httpx.Client(timeout=25) as client:
        page = 1
        while page <= MAX_PAGES:
            url  = f"{LIST_URL}?page={page}" if page > 1 else LIST_URL
            soup = _get(client, url)
            if not soup:
                break

            listings = _parse_listing_page(soup, known)
            if not listings:
                log.info(f"companymarket: Seite {page} leer — fertig")
                break

            log.info(f"companymarket: Seite {page} — {len(listings)} neue Inserate")

            # Detail-Seite für jedes Inserat abrufen
            for item in listings:
                detail = _detail(client, item["external_ref"])
                item.update(detail)
                time.sleep(SLEEP)

            results.extend(listings)
            time.sleep(SLEEP)

            # Nächste Seite vorhanden?
            next_link = soup.find("a", rel=lambda v: v and "next" in v)
            if not next_link:
                break
            page += 1

    log.info(f"companymarket: {len(results)} Inserate total gefunden")
    return results
