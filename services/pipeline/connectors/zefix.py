"""
Zefix-Connector — Delta-Scanner für aktive Schweizer Firmen.

Strategie:
  - POST /company/search mit 2-char-Prefix × Kanton (API-Minimum)
  - activeOnly=True, kein Zeitfilter (Zefix hat keinen)
  - Dedup via uid (CHE-Nummer): bereits bekannte Firmen werden übersprungen
  - Schreibt neu gefundene Firmen als companies(status='neu') + source(latent/zefix)

Kosten: ~72k API-Calls für Vollscan (1394 Prefixe × 26 Kantone × 2 RF)
Rate-Limit: 0.15s sleep zwischen Calls → ~3h pro Vollscan
"""
import time
import logging
import requests
from requests.auth import HTTPBasicAuth

log = logging.getLogger(__name__)

# ── Zefix API ─────────────────────────────────────────────────────────────────

ZEFIX_URL  = "https://www.zefix.admin.ch/ZefixPublicREST/api/v1/company/search"
ZEFIX_AUTH = HTTPBasicAuth("info@kicompany.ch", "xJ9JPRfK")

# 26 Schweizer Kantone
KANTONE = [
    "AG","AI","AR","BE","BL","BS","FR","GE","GL","GR",
    "JU","LU","NE","NW","OW","SG","SH","SO","SZ","TG",
    "TI","UR","VD","VS","ZG","ZH"
]

# Rechtsformen-Filter (nur KMU-relevante)
RECHTSFORMEN = ["AG", "GmbH"]

# 1394 zwei-stellige Prefixe (A-Z + Umlaute, 0-9, Kombinationen)
def _build_prefixes() -> list[str]:
    letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    umlaute = "ÄÖÜ"
    prefixes: list[str] = []
    for a in letters + umlaute:
        for b in letters + "0123456789":
            prefixes.append(a + b)
    for d in "0123456789":
        for b in letters:
            prefixes.append(d + b)
    for d1 in "123456789":
        for d2 in "0123456789":
            prefixes.append(d1 + d2)
    return prefixes

PREFIXES = _build_prefixes()


def _search(prefix: str, canton: str, rechtsform: str) -> list[dict]:
    """Einzel-Query an Zefix. Gibt [] bei Fehler zurück."""
    body = {
        "name":       prefix,
        "canton":     canton,
        "legalForm":  rechtsform,
        "activeOnly": True,
        "maxEntries": 200,
    }
    try:
        r = requests.post(ZEFIX_URL, json=body, auth=ZEFIX_AUTH, timeout=15)
        if r.status_code == 400:
            return []
        r.raise_for_status()
        data = r.json()
        return data if isinstance(data, list) else data.get("list", [])
    except Exception as e:
        log.warning(f"Zefix {canton}/{prefix}: {e}")
        return []


def _normalize(raw: dict, canton: str) -> dict:
    """Zefix-Roh-Record → company-Dict."""
    uid = raw.get("uid") or raw.get("chid") or ""

    # legalForm ist ein Objekt mit shortName.de
    lf_obj = raw.get("legalForm") or {}
    if isinstance(lf_obj, dict):
        legal_form = (lf_obj.get("shortName") or {}).get("de") or lf_obj.get("name", "")
    else:
        legal_form = str(lf_obj)

    return {
        "uid":          uid.strip() if uid else None,
        "name":         raw.get("name", "").strip(),
        "canton":       canton,                          # aus Suchkontext
        "legal_form":   legal_form or None,
        "founded_year": _parse_year(raw.get("sogcDate")),  # Näherung; Detail-Endpoint für exaktes Jahr
        "purpose":      None,                            # nur via Detail-Endpoint
        "branche":      None,
    }


def _parse_year(date_str: str | None) -> int | None:
    if not date_str:
        return None
    try:
        return int(str(date_str)[:4])
    except Exception:
        return None


# ── Public API ────────────────────────────────────────────────────────────────

from typing import Callable

def scan_delta(
    known_uids: set[str],
    canton_filter: list[str] | None = None,
    on_batch: Callable[[list[dict]], None] | None = None,
    batch_size: int = 5_000,
) -> list[dict]:
    """
    Scannt Zefix und gibt nur NEUE Firmen (nicht in known_uids) zurück.

    on_batch: optionaler Callback, der alle batch_size Firmen aufgerufen wird.
              Wenn gesetzt, wird er mit dem aktuellen Batch aufgerufen und der
              Puffer geleert — Speicherbedarf bleibt konstant O(batch_size).
              Ohne on_batch: alle Firmen werden in einer Liste zurückgegeben.
    """
    kantone = canton_filter or KANTONE
    new_companies: list[dict] = []
    seen_uids: set[str] = set()
    total_flushed = 0

    total = len(PREFIXES) * len(kantone) * len(RECHTSFORMEN)
    done  = 0

    for kt in kantone:
        kt_new = 0
        for rf in RECHTSFORMEN:
            for prefix in PREFIXES:
                results = _search(prefix, kt, rf)
                done += 1

                for raw in results:
                    company = _normalize(raw, kt)
                    uid = company.get("uid")
                    if not uid or uid in known_uids or uid in seen_uids:
                        continue
                    seen_uids.add(uid)
                    known_uids.add(uid)
                    new_companies.append(company)
                    kt_new += 1

                # Batch-Flush wenn Callback gesetzt und Puffer voll
                if on_batch and len(new_companies) >= batch_size:
                    on_batch(new_companies)
                    total_flushed += len(new_companies)
                    new_companies = []

                if done % 200 == 0:
                    pct = done / total * 100
                    buffered = len(new_companies)
                    log.info(
                        f"Zefix: {done}/{total} ({pct:.0f}%) — "
                        f"{total_flushed + buffered} neu gesamt"
                    )

                time.sleep(0.05 if not results else 0.15)

        log.info(f"Zefix: Kanton {kt} fertig — {kt_new} neu")

    # Restlicher Puffer
    if on_batch and new_companies:
        on_batch(new_companies)
        total_flushed += len(new_companies)
        new_companies = []

    grand_total = total_flushed + len(new_companies)
    log.info(f"Zefix: Scan abgeschlossen — {grand_total} neue Firmen")
    return new_companies  # leer wenn on_batch, voll wenn nicht
