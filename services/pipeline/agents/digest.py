"""
Digest Agent — täglich 09:00.

Erstellt eine Tagesübersicht:
  - Wie viele Firmen in jeder Phase?
  - Wie viele Outreach-Elemente warten auf Genehmigung?
  - Top 5 neue qualifizierte Firmen
  - Gibt einen Zusammenfassung-Dict zurück (kein Email, kein externe Call)
"""
import logging
from db import get_db

log = logging.getLogger(__name__)


def run() -> dict:
    """Erstellt Tagesübersicht und gibt Stats zurück."""
    log.info("=== Digest: Start ===")
    db = get_db()

    # Firmen nach Status
    res = db.table("companies").select("status").execute()
    companies = res.data or []
    by_status: dict[str, int] = {}
    for c in companies:
        s = c["status"]
        by_status[s] = by_status.get(s, 0) + 1

    # Outreach-Queue
    res_q = db.table("outreach").select("status").eq("status", "pending").execute()
    pending_outreach = len(res_q.data or [])

    # Top 5 Qualified (höchster Score)
    res_top = (
        db.table("scores")
        .select("company_id, combined, companies (name, canton, status)")
        .order("combined", desc=True)
        .limit(5)
        .execute()
    )
    top5 = [
        {
            "name":    row.get("companies", {}).get("name", "?") if row.get("companies") else "?",
            "canton":  row.get("companies", {}).get("canton") if row.get("companies") else None,
            "score":   round(row["combined"], 1),
        }
        for row in (res_top.data or [])
        if row.get("companies", {}).get("status") == "qualified"
    ]

    stats = {
        "companies_by_status": by_status,
        "total_companies":     sum(by_status.values()),
        "pending_outreach":    pending_outreach,
        "top5_qualified":      top5,
    }

    log.info(f"Digest: {stats['total_companies']} Firmen total, {pending_outreach} Outreach ausstehend")
    for entry in top5:
        log.info(f"  Top: {entry['name']} ({entry['canton']}) — Score {entry['score']}")

    log.info("=== Digest fertig ===")
    return stats
