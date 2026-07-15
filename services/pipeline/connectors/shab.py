"""
SHAB-Connector — Schweizerisches Handelsamtsblatt.

Scannt täglich HR-Mutationen auf Rücktritts- und Nachfolge-Signale:
  - VR-Rücktritt / Verwaltungsrat-Änderung
  - Geschäftsführer-Wechsel
  - Sitzverlegung (Mobilität-Signal)
  - Auflösung / Liquidation (KO-Signal)

API: https://www.shab.ch/api/v1/publications (öffentlich, kein Auth)
     publicationTypes=HR04 = Handelsregister-Mutationen
"""
import re
import time
import logging
import datetime
import requests

log = logging.getLogger(__name__)

SHAB_BASE = "https://www.shab.ch/api/v1/publications"
PAGE_SIZE = 200

# Keywords die Nachfolge-Signale anzeigen
RUECKTRITT_RE = re.compile(
    r"tritt\s+zurück|zurückgetreten|austritt|aus\s+dem\s+verwaltungsrat|"
    r"geschäftsführer.*wechsel|inhaber.*wechsel|nachfolge|liquidation",
    re.IGNORECASE,
)

# Keywords die sofortigen KO anzeigen (Liquidation = zu spät)
LIQUIDATION_RE = re.compile(r"liquidation|auflösung|konkurs", re.IGNORECASE)

# Rechtsformen die uns interessieren
RELEVANT_RF = re.compile(r"\b(AG|GmbH|Sàrl|SA)\b")


def _fetch_page(date_from: str, date_to: str, page: int) -> dict:
    params = {
        "publicationStates": "PUBLISHED",
        "publicationTypes":  "HR04",
        "issuedDateFrom":    date_from,
        "issuedDateTo":      date_to,
        "pageRequest.page":  page,
        "pageRequest.size":  PAGE_SIZE,
    }
    try:
        r = requests.get(SHAB_BASE, params=params, timeout=20)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        log.warning(f"SHAB Seite {page}: {e}")
        return {}


def _parse_company_name(text: str) -> str | None:
    """Extrahiert den Firmennamen aus dem SHAB-Publikationstext."""
    # Typisches Muster: "Firma AG, in Zürich" oder "Firma GmbH, ..."
    m = re.search(r"^([^,\n]{5,80}(?:AG|GmbH|Sàrl|SA|KG|OHG))", text, re.IGNORECASE)
    return m.group(1).strip() if m else None


def _parse_canton(data: dict) -> str | None:
    """Kanton aus SHAB-Record."""
    # SHAB liefert canton direkt
    return data.get("cantonId") or data.get("canton")


def _parse_uid(text: str) -> str | None:
    """CHE-Nummer aus Publikationstext."""
    m = re.search(r"CHE[-\s]?\d{3}[-\s.]?\d{3}[-\s.]?\d{3}", text)
    return m.group(0).replace(" ", "").replace(".", "-") if m else None


def _normalize(pub: dict) -> dict | None:
    """SHAB-Publikation → company-Signal-Dict. None wenn irrelevant."""
    text = pub.get("title", "") + " " + pub.get("text", "")

    # Nur AG/GmbH
    if not RELEVANT_RF.search(text):
        return None

    # Nachfolge-Signal erkannt?
    ruecktritt = bool(RUECKTRITT_RE.search(text))
    liquidation = bool(LIQUIDATION_RE.search(text))

    name = _parse_company_name(text) or pub.get("title", "")[:80]
    uid  = _parse_uid(text)

    return {
        "uid":            uid,
        "name":           name.strip(),
        "canton":         _parse_canton(pub),
        "legal_form":     None,   # aus Zefix-Verifikation
        "founded_year":   None,
        "purpose":        None,
        "branche":        None,
        # Enrichment-Signale direkt aus SHAB
        "_shab_ruecktritt": ruecktritt and not liquidation,
        "_liquidation":     liquidation,
        "_shab_pub_id":     pub.get("id"),
        "_shab_date":       pub.get("issuedDate"),
    }


# ── Public API ────────────────────────────────────────────────────────────────

def scan(days_back: int = 1) -> list[dict]:
    """
    Scannt SHAB-Mutationen der letzten `days_back` Tage.
    Gibt Liste von company-Signal-Dicts zurück.
    days_back=30 für Erstlauf; days_back=1 für täglichen Cron.
    """
    today     = datetime.date.today()
    date_from = (today - datetime.timedelta(days=days_back)).isoformat()
    date_to   = today.isoformat()

    log.info(f"SHAB: Scan {date_from} → {date_to}")

    results: list[dict] = []
    page = 0

    while True:
        data = _fetch_page(date_from, date_to, page)
        publications = data.get("content", [])
        total_pages  = data.get("totalPages", 1)

        for pub in publications:
            signal = _normalize(pub)
            if signal is None:
                continue
            if signal.get("_liquidation"):
                log.debug(f"SHAB: Liquidation übersprungen — {signal['name']}")
                continue
            results.append(signal)

        log.info(f"SHAB: Seite {page+1}/{total_pages} — {len(results)} Signale bisher")

        if page >= total_pages - 1:
            break
        page += 1
        time.sleep(0.3)

    ruecktritt_count = sum(1 for r in results if r.get("_shab_ruecktritt"))
    log.info(f"SHAB: {len(results)} Mutationen, davon {ruecktritt_count} mit Rücktritts-Signal")
    return results
