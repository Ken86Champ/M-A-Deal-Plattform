"""
Connector: firmenboerse.com — D-A-CH Firmenbörse (Schweizer Inserate herausgefiltert).

Listings-Seite: https://firmenboerse.com/firmenangebote/
Paginierung: WordPress Content Views (JS-basiert, AJAX-Endpoint entdeckbar)
  → Fallback: nur Seite 1 (9 Inserate) via regulärem HTTP

Schweiz-Filter: detail['Standort'] == 'Schweiz'
"""
import logging
import re
import time

import httpx
from bs4 import BeautifulSoup

log = logging.getLogger(__name__)

BASE_URL  = "https://firmenboerse.com"
LIST_URL  = f"{BASE_URL}/firmenangebote/"
SLEEP     = 1.5

# WordPress Content Views AJAX-Endpoint (falls JS-Pagination aktiv)
AJAX_URL  = f"{BASE_URL}/wp-admin/admin-ajax.php"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/125.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "de-DE,de;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Referer": BASE_URL,
}

CANTON_MAP: dict[str, str] = {
    "zürich": "ZH", "bern": "BE", "luzern": "LU", "uri": "UR",
    "schwyz": "SZ", "obwalden": "OW", "nidwalden": "NW", "glarus": "GL",
    "zug": "ZG", "freiburg": "FR", "solothurn": "SO",
    "basel-stadt": "BS", "basel": "BS", "basel-land": "BL",
    "schaffhausen": "SH", "st. gallen": "SG", "graubünden": "GR",
    "aargau": "AG", "thurgau": "TG", "tessin": "TI", "ticino": "TI",
    "waadt": "VD", "wallis": "VS", "neuenburg": "NE", "genf": "GE",
    "jura": "JU",
}


def _get(client: httpx.Client, url: str, **kwargs) -> BeautifulSoup | None:
    try:
        r = client.get(url, headers=HEADERS, follow_redirects=True, timeout=20, **kwargs)
        if r.status_code != 200:
            log.warning(f"firmenboerse: {r.status_code} für {url}")
            return None
        return BeautifulSoup(r.text, "html.parser")
    except Exception as e:
        log.warning(f"firmenboerse: Fehler bei {url}: {e}")
        return None


def _parse_chf(text: str) -> int | None:
    """'ca. 700 TCHF' → 700_000; '1,2 Mio. CHF' → 1_200_000"""
    t = text.replace("'", "").replace("'", "").replace(",", ".")
    m = re.search(r"([\d.]+)\s*(?:Mio|mio)\b", t, re.IGNORECASE)
    if m:
        return int(float(m.group(1)) * 1_000_000)
    m = re.search(r"([\d.]+)\s*(?:TCHF|Tsd|k)\b", t, re.IGNORECASE)
    if m:
        return int(float(m.group(1)) * 1_000)
    return None


def _parse_mitarbeiter(text: str) -> int | None:
    m = re.search(r"(\d+)", text)
    return int(m.group(1)) if m else None


def _canton_from_region(region: str) -> str | None:
    key = region.lower().strip()
    for name, code in CANTON_MAP.items():
        if name in key:
            return code
    return None


def _detail(client: httpx.Client, url: str) -> dict | None:
    """
    Fetcht Detail-Seite.
    Returns None wenn Standort nicht Schweiz.
    Returns dict mit Feldern wenn CH.
    """
    soup = _get(client, url)
    if not soup:
        return None

    result: dict = {"external_ref": url}

    # Detail-Tabelle parsen (Key: Value Rows)
    table_data: dict[str, str] = {}
    for row in soup.find_all("tr"):
        cells = row.find_all(["th", "td"])
        if len(cells) >= 2:
            k = cells[0].get_text(strip=True).lower()
            v = cells[1].get_text(" ", strip=True)
            table_data[k] = v

    # Schweiz-Filter
    standort = table_data.get("standort", "")
    if standort and "schweiz" not in standort.lower():
        return None  # Deutschland/Österreich überspringen

    # Kanton aus Region ableiten
    region = table_data.get("region", "")
    if region:
        result["canton"] = _canton_from_region(region)

    # Branche
    branche = table_data.get("branche", table_data.get("tätigkeitsgebiet", ""))
    if branche:
        result["branche"] = branche[:200]

    # Finanzen
    umsatz_raw = table_data.get("jahresumsatz", table_data.get("umsatz", ""))
    if umsatz_raw:
        result["umsatz_est_chf"] = _parse_chf(umsatz_raw)

    ebitda_raw = table_data.get("ebitda", "")
    if ebitda_raw:
        result["ebitda_raw"] = ebitda_raw

    mitarb_raw = table_data.get("mitarbeiter", table_data.get("mitarbeiterzahl", ""))
    if mitarb_raw:
        result["mitarbeiter_est"] = _parse_mitarbeiter(mitarb_raw)

    rechtsform = table_data.get("rechtsform", "")
    if rechtsform:
        result["rechtsform"] = rechtsform

    # Beschreibung aus Teaser / Haupttext
    desc_el = soup.find("div", class_=re.compile("entry.content|post.content|description", re.I))
    if desc_el:
        result["description"] = desc_el.get_text(" ", strip=True)[:2000]

    return result


def _listing_urls_from_page(soup: BeautifulSoup) -> list[tuple[str, str]]:
    """Gibt (title, url) aus den Listing-Cards einer Seite zurück."""
    results: list[tuple[str, str]] = []
    for item in soup.find_all(class_="pt-cv-content-item"):
        a = item.find("h4", class_="pt-cv-title")
        if not a:
            a = item.find("h3") or item.find("h2")
        if not a:
            continue
        link = a.find("a") if a else None
        if not link:
            continue
        href  = link.get("href", "")
        title = link.get_text(strip=True)
        if href and title:
            if not href.startswith("http"):
                href = BASE_URL + href
            results.append((title, href))
    return results


def _try_ajax_pages(client: httpx.Client, max_pages: int = 9) -> list[tuple[str, str]]:
    """
    Versucht WordPress Content Views AJAX-Pagination.
    Die shortcode_atts + pt-cv-page Parameter sind nötig.
    Fällt still zurück auf leere Liste wenn AJAX nicht verfügbar.
    """
    all_urls: list[tuple[str, str]] = []

    # Zuerst Seite 1 laden um js-Konfiguration zu extrahieren
    soup = _get(client, LIST_URL)
    if not soup:
        return all_urls

    # Seite 1 extrahieren
    all_urls.extend(_listing_urls_from_page(soup))

    # AJAX-Payload aus verstecktem Input oder Script-Tag extrahieren
    view_id   = None
    nonce_val = None

    # WordPress Content Views hinterlegt seine Config in Script-Tags
    for script in soup.find_all("script"):
        text = script.string or ""
        m_id    = re.search(r'"view_id"\s*:\s*"?(\d+)"?', text)
        m_nonce = re.search(r'"nonce"\s*:\s*"([^"]+)"', text)
        if m_id:
            view_id = m_id.group(1)
        if m_nonce:
            nonce_val = m_nonce.group(1)

    if not view_id:
        log.info("firmenboerse: Kein AJAX-View-ID gefunden — nur Seite 1")
        return all_urls

    log.info(f"firmenboerse: AJAX view_id={view_id}, Seiten 2–{max_pages}")

    for p in range(2, max_pages + 1):
        try:
            r = client.post(
                AJAX_URL,
                headers={**HEADERS, "Content-Type": "application/x-www-form-urlencoded"},
                data={
                    "action":   "pt_cv_pagination",
                    "view_id":  view_id,
                    "page_number": str(p),
                    "nonce":    nonce_val or "",
                },
                timeout=20,
            )
            if r.status_code != 200:
                log.warning(f"firmenboerse AJAX: Seite {p} → HTTP {r.status_code}")
                break
            ajax_soup = BeautifulSoup(r.text, "html.parser")
            urls = _listing_urls_from_page(ajax_soup)
            if not urls:
                log.info(f"firmenboerse AJAX: Seite {p} leer — fertig")
                break
            all_urls.extend(urls)
            log.info(f"firmenboerse: AJAX Seite {p} — {len(urls)} Inserate")
            time.sleep(SLEEP)
        except Exception as e:
            log.warning(f"firmenboerse AJAX Seite {p}: {e}")
            break

    return all_urls


def scan(known_external_refs: set[str] | None = None) -> list[dict]:
    """
    Scannt firmenboerse.com, filtert auf Standort=Schweiz.
    Returns Liste Company-Dicts mit origination='listed'.
    """
    known   = known_external_refs or set()
    results: list[dict] = []

    with httpx.Client(timeout=25) as client:
        listing_urls = _try_ajax_pages(client)
        seen: set[str] = set()

        log.info(f"firmenboerse: {len(listing_urls)} Inserate auf Listings-Seiten gefunden")

        for title, url in listing_urls:
            if url in known or url in seen:
                continue
            seen.add(url)

            detail = _detail(client, url)
            if detail is None:
                # Nicht Schweiz oder Fehler
                continue

            detail["name"] = title[:200]
            results.append(detail)
            time.sleep(SLEEP)

    log.info(f"firmenboerse: {len(results)} Schweizer Inserate nach Filter")
    return results
