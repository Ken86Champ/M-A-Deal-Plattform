"""
Connector: nachfolgeportal.ch
Listing-URL: https://nachfolgeportal.ch/marktplatz (paginiert)
Format: JSON-LD / HTML cards
"""
import logging, time, re
import httpx
from bs4 import BeautifulSoup

log    = logging.getLogger(__name__)
BASE   = "https://nachfolgeportal.ch"
LIST   = BASE + "/marktplatz"
SLEEP  = 1.5
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; DealOriginationBot/1.0; +https://10xgroup.ch)",
    "Accept-Language": "de-CH,de;q=0.9",
}

CANTON_MAP = {
    "Deutschschweiz": None, "Westschweiz": None, "Tessin": "TI",
    "Zürich": "ZH", "Bern": "BE", "Luzern": "LU", "Zug": "ZG",
    "Aargau": "AG", "St. Gallen": "SG", "Solothurn": "SO",
    "Basel": "BS", "Graubünden": "GR", "Wallis": "VS",
}

def _parse_canton(text: str) -> str | None:
    for k, v in CANTON_MAP.items():
        if k.lower() in text.lower():
            return v
    return None

def scan(known_refs: set[str]) -> list[dict]:
    """Scrapes nachfolgeportal.ch/marktplatz and returns new listings."""
    results: list[dict] = []
    client = httpx.Client(headers=HEADERS, timeout=httpx.Timeout(15.0), follow_redirects=True)

    page = 1
    while True:
        url = f"{LIST}?page={page}" if page > 1 else LIST
        try:
            resp = client.get(url)
            if resp.status_code != 200:
                break
        except Exception as e:
            log.warning(f"nachfolgeportal page {page}: {e}")
            break

        soup = BeautifulSoup(resp.text, "html.parser")

        # Find listing cards — div with data-id or article tags
        cards = soup.select("a[href*='/marktplatz/angebote/']")
        if not cards:
            break

        new_on_page = 0
        for a in cards:
            href = a.get("href", "")
            if not href or href in known_refs:
                continue
            full_url = BASE + href if href.startswith("/") else href

            # Extract basic info from card
            title   = a.get_text(strip=True)[:200]
            card    = a.find_parent("div") or a
            canton  = None
            branche = None
            preis   = None

            txt = card.get_text(" ", strip=True)
            for k, v in CANTON_MAP.items():
                if k in txt:
                    canton = v or k[:2].upper()
                    break

            results.append({
                "title":        title,
                "url":          full_url,
                "source":       "nachfolgeportal.ch",
                "canton":       canton,
                "branche":      branche,
                "preis_raw":    preis,
            })
            known_refs.add(full_url)
            new_on_page += 1

        log.info(f"nachfolgeportal.ch page {page}: {new_on_page} new")
        if new_on_page == 0:
            break
        page += 1
        time.sleep(SLEEP)

    client.close()
    return results
