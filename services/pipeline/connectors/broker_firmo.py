"""
Connector: firmo.ch
WordPress-basiert. Listings unter: https://firmo.ch/kategorie/firmenangebote/page/N/
"""
import logging, time, re
import httpx
from bs4 import BeautifulSoup

log     = logging.getLogger(__name__)
BASE    = "https://firmo.ch"
LIST    = BASE + "/kategorie/firmenangebote/"
SLEEP   = 1.2
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; DealOriginationBot/1.0; +https://10xgroup.ch)",
    "Accept-Language": "de-CH,de;q=0.9",
}

def scan(known_refs: set[str]) -> list[dict]:
    results: list[dict] = []
    client  = httpx.Client(headers=HEADERS, timeout=httpx.Timeout(15.0), follow_redirects=True)

    page = 1
    while True:
        url = f"{LIST}page/{page}/" if page > 1 else LIST
        try:
            resp = client.get(url)
            if resp.status_code != 200:
                break
        except Exception as e:
            log.warning(f"firmo page {page}: {e}")
            break

        soup = BeautifulSoup(resp.text, "html.parser")

        # WordPress: post articles or listing cards
        articles = soup.select("article, .listing-item, .entry-content a[href*='/inserate/']")
        if not articles:
            # Try generic links to /inserate/
            articles = soup.select("a[href*='/inserate/']")

        new_on_page = 0
        seen_hrefs: set[str] = set()

        for el in articles:
            if el.name == "a":
                href = el.get("href", "")
                title_text = el.get_text(strip=True)[:200]
            else:
                a = el.select_one("a[href*='/inserate/']")
                if not a:
                    continue
                href       = a.get("href", "")
                title_text = (el.select_one("h2,h3,.title") or a).get_text(strip=True)[:200]

            if not href or href in known_refs or href in seen_hrefs:
                continue
            seen_hrefs.add(href)

            # Extract meta from card text
            txt     = el.get_text(" ", strip=True) if hasattr(el, "get_text") else ""
            canton  = None
            branche = None

            # firmo shows "Region/Kanton: Bern" pattern
            m = re.search(r"Kanton[:\s]+([A-ZÄÖÜa-zäöü\s]+)", txt)
            if m:
                from connectors.broker_companymarket import CANTON_CODES
                raw = m.group(1).strip().split()[0]
                canton = CANTON_CODES.get(raw, raw[:2].upper() if len(raw) >= 2 else None)

            m2 = re.search(r"Branche[:\s]+([^\n|·]+)", txt)
            if m2:
                branche = m2.group(1).strip()[:80]

            results.append({
                "title":   title_text,
                "url":     href,
                "source":  "firmo.ch",
                "canton":  canton,
                "branche": branche,
            })
            known_refs.add(href)
            new_on_page += 1

        log.info(f"firmo.ch page {page}: {new_on_page} new")
        if new_on_page == 0:
            break
        page += 1
        time.sleep(SLEEP)

    client.close()
    return results
