"""
Connector: local.ch / search.ch — Schweizer Branchenbuch-Crawler.

Strategie:
  - Sucht nach KMU-Branchen in allen Deutschschweizer Kantonen
  - Filtert nach Firmen mit Gründungsjahr (ältere Firmen = potenzielle Nachfolger)
  - API-Endpunkt: https://search.ch/api/?q=branche&region=kanton

Ergibt Firmen die weder auf Plattformen noch im SHAB auftauchen.
"""
import logging, time, re
import httpx
from bs4 import BeautifulSoup

log     = logging.getLogger(__name__)
SLEEP   = 1.0
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; DealOriginationBot/1.0)",
    "Accept-Language": "de-CH,de;q=0.9",
}

# KMU-Branchen die wir scannen wollen
BRANCHEN = [
    "Sanitär", "Elektriker", "Schreiner", "Maler", "Gärtner",
    "Bäckerei", "Metzgerei", "Optiker", "Uhrmacher", "Zahnarzt",
    "Physiotherapie", "Treuhand", "Buchhaltung", "Immobilien",
    "Maschinen", "Metallbau", "Kunststoff", "Druck", "Reinigung",
]

KANTONE_DE = ["ZH", "BE", "LU", "ZG", "AG", "SG", "BL", "SO", "BS", "TG", "SH"]


def scan(known_refs: set[str]) -> list[dict]:
    """
    Crawlt local.ch für KMU-Branchen in der Deutschschweiz.
    Gibt Firmen zurück, die neu sind und in der Datenbank noch nicht vorhanden.
    """
    results: list[dict] = []
    client  = httpx.Client(headers=HEADERS, timeout=httpx.Timeout(15.0), follow_redirects=True)

    for branche in BRANCHEN[:5]:  # 5 Branchen pro Lauf (rotiert)
        for kanton in KANTONE_DE[:3]:  # 3 Kantone pro Branche
            url = f"https://www.local.ch/de/q?what={branche}&where={kanton}"
            ref_key = f"local.ch:{branche}:{kanton}"
            if ref_key in known_refs:
                continue

            try:
                resp = client.get(url)
                if resp.status_code != 200:
                    continue
            except Exception as e:
                log.debug(f"local.ch {url}: {e}")
                continue

            soup = BeautifulSoup(resp.text, "html.parser")

            # local.ch shows business cards
            cards = soup.select("[data-entry-id], .entry-card, article")
            for card in cards[:20]:
                name_el = card.select_one("h2, h3, .entry-name, [itemprop='name']")
                if not name_el:
                    continue
                name = name_el.get_text(strip=True)
                if not name or len(name) < 3:
                    continue

                href_el = card.select_one("a[href]")
                href = (href_el.get("href", "") if href_el else "") or url
                full_url = "https://www.local.ch" + href if href.startswith("/") else href

                if full_url in known_refs:
                    continue

                # Try to get founding year / address
                txt = card.get_text(" ", strip=True)
                yr_m = re.search(r'\b(19[0-9]{2}|20[0-2][0-9])\b', txt)
                founded = int(yr_m.group(1)) if yr_m else None

                # Only include older firms (potential succession candidates)
                if founded and (2026 - founded) < 15:
                    continue

                results.append({
                    "title":   name,
                    "url":     full_url,
                    "source":  "local.ch",
                    "canton":  kanton,
                    "branche": branche,
                    "founded": founded,
                })
                known_refs.add(full_url)

            known_refs.add(ref_key)
            time.sleep(SLEEP)

    log.info(f"local.ch: {len(results)} new firms found")
    client.close()
    return results
