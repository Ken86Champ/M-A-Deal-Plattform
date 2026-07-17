"""
Connector: business-broker.ch — Marktführer CH M&A (JS-heavy, RSS-Fallback).

Strategie A: RSS-Feed (falls vorhanden)
Strategie B: Sitemap-Scraping
Strategie C: Direct listing page mit httpx + BS4
"""
import logging, time, re
import httpx
from bs4 import BeautifulSoup

log     = logging.getLogger(__name__)
BASE    = "https://www.business-broker.ch"
SLEEP   = 2.0
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; DealOriginationBot/1.0; +https://10xgroup.ch)",
    "Accept-Language": "de-CH,de;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

def scan(known_refs: set[str]) -> list[dict]:
    results: list[dict] = []
    client  = httpx.Client(headers=HEADERS, timeout=httpx.Timeout(20.0), follow_redirects=True)

    # Try sitemap first
    sitemaps = [
        BASE + "/sitemap.xml",
        BASE + "/sitemap_index.xml",
        BASE + "/sitemap-listings.xml",
    ]

    urls: list[str] = []
    for sm_url in sitemaps:
        try:
            resp = client.get(sm_url)
            if resp.status_code == 200:
                found = re.findall(r'<loc>(https://www\.business-broker\.ch/[^<]*(?:inserate|listing|angebot)[^<]*)</loc>', resp.text)
                urls.extend(found)
                if urls:
                    log.info(f"business-broker.ch sitemap: {len(urls)} URLs")
                    break
        except Exception:
            continue

    # Fallback: scrape listing page
    if not urls:
        listing_pages = [
            BASE + "/de/inserate",
            BASE + "/de/firmen-zu-verkaufen",
            BASE + "/de/verkauf",
            BASE,
        ]
        for lp in listing_pages:
            try:
                resp = client.get(lp)
                if resp.status_code != 200:
                    continue
                soup  = BeautifulSoup(resp.text, "html.parser")
                links = soup.select("a[href*='inserat'], a[href*='listing'], a[href*='angebot']")
                for a in links:
                    href = a.get("href", "")
                    if href and "business-broker.ch" in href:
                        urls.append(href)
                if urls:
                    break
            except Exception as e:
                log.debug(f"business-broker listing {lp}: {e}")
                continue

    new_count = 0
    for url in urls[:100]:
        if url in known_refs:
            continue
        try:
            resp = client.get(url)
            if resp.status_code != 200:
                continue

            soup  = BeautifulSoup(resp.text, "html.parser")
            title = soup.select_one("h1, .listing-title, .inserat-title")
            if not title:
                continue

            title_txt = title.get_text(strip=True)[:200]
            body_txt  = soup.get_text(" ", strip=True)

            # Extract canton
            from connectors.broker_companymarket import CANTON_CODES
            canton = None
            for full, short in CANTON_CODES.items():
                if full in body_txt:
                    canton = short
                    break

            # Extract industry
            branche = None
            bm = re.search(r"(?:Branche|Sektor)[:\s]+([^\n·|]+)", body_txt)
            if bm:
                branche = bm.group(1).strip()[:80]

            results.append({
                "title":   title_txt,
                "url":     url,
                "source":  "business-broker.ch",
                "canton":  canton,
                "branche": branche,
            })
            known_refs.add(url)
            new_count += 1
            time.sleep(SLEEP)
        except Exception as e:
            log.debug(f"business-broker {url}: {e}")

    log.info(f"business-broker.ch: {new_count} new listings")
    client.close()
    return results
