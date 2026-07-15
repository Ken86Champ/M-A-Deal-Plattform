"""
Dedup-Utility.

Zefix liefert Firmen anhand von UIDs — UIDs sind eindeutig, Duplikate entstehen
nur wenn derselbe UID von SHAB und Zefix eingetragen wird.
Die db.py-Funktion upsert_company() verwendet on_conflict="uid", sodass
echte Duplikate verhindert werden.

Diese Datei bietet zusätzliche fuzzy-Dedup-Logik für Fälle ohne UID
(z.B. SHAB-Einträge ohne UID-Match) oder nach einem Doppel-Radar-Lauf.
"""
import logging
import re
import unicodedata
from db import get_db

log = logging.getLogger(__name__)


def _normalize_name(name: str) -> str:
    """Lowercase, remove legal forms and accents for fuzzy matching."""
    n = name.lower()
    n = unicodedata.normalize("NFKD", n).encode("ascii", "ignore").decode("ascii")
    for s in [" ag", " gmbh", " sarl", " sa", " sàrl", " in liquidation",
              " in aufloesung", " inh.", " & co."]:
        n = n.replace(s, "")
    n = re.sub(r"[^a-z0-9]", "", n)
    return n.strip()


def find_duplicates() -> list[dict]:
    """
    Returns list of {canonical_id, duplicate_ids, name} for review.
    Groups companies by normalized name + canton.
    """
    db = get_db()
    res = db.table("companies").select("id, name, canton, uid").execute()
    rows = res.data or []

    groups: dict[str, list[dict]] = {}
    for row in rows:
        key = f"{_normalize_name(row['name'])}|{(row['canton'] or '').lower()}"
        groups.setdefault(key, []).append(row)

    return [
        {
            "canonical_id":  group[0]["id"],
            "duplicate_ids": [r["id"] for r in group[1:]],
            "name":          group[0]["name"],
            "canton":        group[0].get("canton"),
            "count":         len(group),
        }
        for group in groups.values()
        if len(group) > 1
    ]


def merge_duplicates(dry_run: bool = True) -> int:
    """
    Merges duplicates: keeps canonical (first inserted), reassigns relations,
    deletes duplicate company rows.
    Returns number of merged duplicates.
    """
    dupes = find_duplicates()
    if not dupes:
        log.info("Dedup: Keine Duplikate gefunden")
        return 0

    log.info(f"Dedup: {len(dupes)} Duplikat-Gruppen gefunden (dry_run={dry_run})")
    db = get_db()
    merged = 0

    for group in dupes:
        canonical = group["canonical_id"]
        dupe_ids  = group["duplicate_ids"]
        log.info(f"  {group['name']} ({group['canton']}): {len(dupe_ids)} Duplikat(e)")

        if dry_run:
            continue

        # Reassign all related records to canonical_id
        for table in ["company_sources", "enrichment", "scores", "gates", "decisions", "outreach"]:
            for did in dupe_ids:
                try:
                    db.table(table).update({"company_id": canonical}).eq("company_id", did).execute()
                except Exception as e:
                    log.debug(f"  {table}: {e}")

        # Delete duplicates
        for did in dupe_ids:
            db.table("companies").delete().eq("id", did).execute()

        merged += len(dupe_ids)

    log.info(f"Dedup: {merged} Duplikate {'würden gemerged' if dry_run else 'gemerged'}")
    return merged


if __name__ == "__main__":
    import os
    from dotenv import load_dotenv
    load_dotenv(dotenv_path="../../.env.local")
    if not os.environ.get("SUPABASE_URL"):
        os.environ["SUPABASE_URL"] = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

    import sys
    dry = "--apply" not in sys.argv
    n = merge_duplicates(dry_run=dry)
    print(f"{'Dry-run:' if dry else 'Applied:'} {n} duplicates {'found' if dry else 'merged'}")
    print("Use --apply to actually merge.")
