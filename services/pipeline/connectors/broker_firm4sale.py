"""
Connector: firm4sale.ch
386 Angebote, öffentliche Listing-Seite ohne Login sichtbar.
URL-Muster: https://firm4sale.ch/company/[slug]/
"""
import logging, time, re
import httpx
from bs4 import BeautifulSoup

log     = logging.getLogger(__name__)
BASE    = "https://firm4sale.ch"
SLEEP   = 1.5
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; DealOriginationBot/1.0; +https://10xgroup.ch)",
    "Accept-Language": "de-CH,de;q=0.9",
}

BRANCHE_MAP = {
    "Restaurant": "Gastronomie / Hotel",
    "Hotel": "Gastronomie / Hotel",
    "Coiffeur": "Dienstleistung",
    "IT": "Informatik / Software",
    "Bäckerei": "Lebensmittel",
    "Sanitär": "Haustechnik",
    "Treuhänder": "Beratung / Finanzen",
    "Treuhand": "Beratung / Finanzen",
}

def scan(known_refs: set[str]) -> list[dict]:
    results: list[dict] = []
    client  = httpx.Client(headers=HEADERS, timeout=httpx.Timeout(15.0), follow_redirects=True)

    # firm4sale lists all companies on front page (no pagination needed for summary)
    # Also try the sitemap
    try:
        sitemap_url = BASE + "/sitemap.xml"
        resp = client.get(sitemap_url)
        if resp.status_code == 200:
            urls = re.findall(r'<loc>(https://firm4sale\.ch/company/[^<]+)</loc>', resp.text)
            log.info(f"firm4sale sitemap: {len(urls)} company URLs")
        else:
            urls = []
    except Exception:
        urls = []

    # Fallback: scrape main page for company links
    if not urls:
        try:
            resp = client.get(BASE)
            soup = BeautifulSoup(resp.text, "html.parser")
            links = soup.select("a[href*='/company/']")
            urls  = list({a["href"] for a in links if a.get("href", "").startswith("http")})
        except Exception as e:
            log.warning(f"firm4sale main page: {e}")

    new_count = 0
    for url in urls[:200]:  # cap at 200 per run
        if url in known_refs:
            continue
        try:
            resp = client.get(url)
            if resp.status_code != 200:
                continue
            soup  = BeautifulSoup(resp.text, "html.parser")
            title = (soup.select_one("h1") or soup.select_one("title"))
            if not title:
                continue
            title_txt = title.get_text(strip=True)[:200]
            body_txt  = soup.get_text(" ", strip=True)

            branche = None
            for k, v in BRANCHE_MAP.items():
                if k.lower() in body_txt.lower():
                    branche = v
                    break

            # Try to extract price
            preis = None
            pm = re.search(r"CHF\s*([\d'\.]+)", body_txt)
            if pm:
                preis = "CHF " + pm.group(1)

            results.append({
                "title":   title_txt,
                "url":     url,
                "source":  "firm4sale.ch",
                "branche": branche,
                "preis_raw": preis,
                "canton":  None,
            })
            known_refs.add(url)
            new_count += 1
            time.sleep(SLEEP)
        except Exception as e:
            log.debug(f"firm4sale {url}: {e}")
            continue

    log.info(f"firm4sale.ch: {new_count} new listings")
    client.close()
    return results
