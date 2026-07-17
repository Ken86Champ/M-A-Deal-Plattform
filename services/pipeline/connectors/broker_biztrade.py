"""
Connector: biz-trade.ch — DACH Nachfolgebörse, Schweiz-Filter.
Schweizer Inserate: https://www.biz-trade.ch/ma-k21t5.htm  (Kanton 21=CH, Typ 5=Nachfolge)
Alternativ alle Nachfolge-Inserate: https://www.biz-trade.ch/ma-t5.htm
"""
import logging, time, re
import httpx
from bs4 import BeautifulSoup

log     = logging.getLogger(__name__)
BASE    = "https://www.biz-trade.ch"
# CH-spezifische Nachfolge-Inserate
CH_URLS = [
    BASE + "/ma-k21t5.htm",   # Schweiz + Nachfolge
    BASE + "/ma-k21t3.htm",   # Schweiz + Unternehmensverkauf
]
SLEEP   = 1.5
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; DealOriginationBot/1.0; +https://10xgroup.ch)",
    "Accept-Language": "de-CH,de;q=0.9",
}

def _extract_canton(text: str) -> str | None:
    canton_pattern = r'\b(ZH|BE|LU|ZG|AG|SG|BL|SO|BS|TG|GR|SH|SZ|GL|UR|OW|NW|AR|AI|FR|VD|VS|NE|GE|TI|JU)\b'
    m = re.search(canton_pattern, text.upper())
    return m.group(1) if m else None

def scan(known_refs: set[str]) -> list[dict]:
    results: list[dict] = []
    client  = httpx.Client(headers=HEADERS, timeout=httpx.Timeout(15.0), follow_redirects=True)

    for list_url in CH_URLS:
        try:
            resp = client.get(list_url)
            if resp.status_code != 200:
                continue
        except Exception as e:
            log.warning(f"biz-trade {list_url}: {e}")
            continue

        soup  = BeautifulSoup(resp.text, "html.parser")
        # biz-trade uses table rows with links to /ma-XXXXX.htm
        links = soup.select("a[href*='/ma-']")

        for a in links:
            href = a.get("href", "")
            if not href or "ma-t" in href or "ma-k" in href:
                continue  # skip navigation links

            full_url = BASE + href if href.startswith("/") else href
            if full_url in known_refs:
                continue

            title_txt = a.get_text(strip=True)[:200]
            if len(title_txt) < 5:
                continue

            # Parent row for more context
            row = a.find_parent("tr") or a.find_parent("td") or a
            row_txt = row.get_text(" ", strip=True)

            canton  = _extract_canton(row_txt)
            # Only include if Swiss (canton found, or row contains "Schweiz"/"CH")
            if not canton and "schweiz" not in row_txt.lower() and " ch " not in row_txt.lower():
                continue

            results.append({
                "title":   title_txt,
                "url":     full_url,
                "source":  "biz-trade.ch",
                "canton":  canton,
                "branche": None,
            })
            known_refs.add(full_url)
            time.sleep(0.2)

    log.info(f"biz-trade.ch: {len(results)} new CH listings")
    client.close()
    return results
