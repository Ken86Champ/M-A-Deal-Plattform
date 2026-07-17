"""
Radar Agent — täglich 06:00.

Ablauf:
  1. SHAB scannen (1 Tag zurück; 30 Tage beim Erstlauf)
  2. Zefix Delta-Scan (alle neuen AG/GmbH)
  3. Broker-Connectors Ebene 2 (alle 8 Plattformen)
  4. Branchenbuch-Scan (local.ch)

Plattformen:
  companymarket.ch · firmenboerse.com · nachfolgeportal.ch · firmo.ch
  firm4sale.ch · biz-trade.ch · business-broker.ch · local.ch
"""
import hashlib
import logging
import os
from datetime import date
from db import (
    get_db,
    upsert_company,
    upsert_source,
    upsert_enrichment,
    update_company_status,
    bulk_upsert_companies,
    bulk_upsert_sources,
)
from connectors.shab import scan as shab_scan
from connectors.zefix import scan_delta
from connectors.broker_companymarket import scan as cm_scan
from connectors.broker_firmenboerse  import scan as fb_scan
from connectors.broker_nachfolgeportal import scan as np_scan
from connectors.broker_firmo          import scan as firmo_scan
from connectors.broker_firm4sale      import scan as f4s_scan
from connectors.broker_biztrade       import scan as biztrade_scan
from connectors.broker_businessbroker import scan as bb_scan
from connectors.broker_localch        import scan as localch_scan

log = logging.getLogger(__name__)

# Erstlauf-Flag: wenn die companies-Tabelle leer ist → 30 Tage SHAB laden
FIRST_RUN_SHAB_DAYS = 30
NORMAL_SHAB_DAYS    = 1

# Alle Broker-Connectors mit Metadaten
BROKER_CONNECTORS = [
    { "fn": cm_scan,       "name": "companymarket.ch",   "active": True  },
    { "fn": fb_scan,       "name": "firmenboerse.com",   "active": True  },
    { "fn": np_scan,       "name": "nachfolgeportal.ch", "active": True  },
    { "fn": firmo_scan,    "name": "firmo.ch",           "active": True  },
    { "fn": f4s_scan,      "name": "firm4sale.ch",       "active": True  },
    { "fn": biztrade_scan, "name": "biz-trade.ch",       "active": True  },
    { "fn": bb_scan,       "name": "business-broker.ch", "active": True  },
    { "fn": localch_scan,  "name": "local.ch",           "active": True  },
]

# ── Helper ────────────────────────────────────────────────────────────────────

def _load_known_uids() -> set[str]:
    """Alle bereits bekannten UIDs aus Supabase laden."""
    db = get_db()
    res = db.table("companies").select("uid").not_.is_("uid", "null").execute()
    return {row["uid"] for row in (res.data or [])}


def _count_companies() -> int:
    db = get_db()
    res = db.table("companies").select("id", count="exact").execute()
    return res.count or 0


def _load_known_broker_refs() -> set[str]:
    """Bereits bekannte externe Listing-URLs aus allen Broker-Quellen."""
    db = get_db()
    all_sources = [c["name"] for c in BROKER_CONNECTORS]
    res = (
        db.table("company_sources")
        .select("external_ref")
        .in_("source_name", all_sources)
        .not_.is_("external_ref", "null")
        .execute()
    )
    return {row["external_ref"] for row in (res.data or [])}


# ── SHAB-Verarbeitung ─────────────────────────────────────────────────────────

def _process_shab(signals: list[dict], known_uids: set[str]) -> tuple[int, int]:
    """
    Schreibt SHAB-Signale in Supabase.
    Returns (neue_firmen, bekannte_firmen_aktualisiert).
    """
    neu = 0
    aktualisiert = 0

    for signal in signals:
        uid  = signal.get("uid")
        name = signal.get("name")
        if not name:
            continue

        is_new = uid not in known_uids if uid else True

        # Firma upserten
        company = upsert_company(
            uid        = uid or f"shab-{signal.get('_shab_pub_id', '')}",
            name       = name,
            canton     = signal.get("canton"),
            legal_form = signal.get("legal_form"),
        )
        cid = company["id"]

        # Source-Eintrag
        upsert_source(
            company_id    = cid,
            origination   = "latent",
            source_name   = "shab",
            external_ref  = str(signal.get("_shab_pub_id", "")),
        )

        # Enrichment: Rücktritts-Signal direkt setzen
        if signal.get("_shab_ruecktritt"):
            upsert_enrichment(cid, {"shab_ruecktritt": True})

        if is_new:
            neu += 1
            if uid:
                known_uids.add(uid)
            log.info(f"SHAB neu: {name} ({signal.get('canton')})")
        else:
            aktualisiert += 1
            log.debug(f"SHAB update: {name} — shab_ruecktritt gesetzt")

    return neu, aktualisiert


# ── Zefix-Verarbeitung ────────────────────────────────────────────────────────

def _flush_zefix_batch(batch: list[dict]) -> int:
    """Schreibt einen Zefix-Batch in Supabase. Returns Anzahl inserted."""
    to_insert = [
        {
            "uid":          c["uid"],
            "name":         c["name"],
            "canton":       c.get("canton"),
            "legal_form":   c.get("legal_form"),
            "founded_year": c.get("founded_year"),
            "purpose":      c.get("purpose"),
            "status":       "neu",
        }
        for c in batch
        if c.get("uid")
    ]
    if not to_insert:
        return 0

    log.info(f"Zefix: Batch-Insert {len(to_insert)} Firmen…")
    rows = bulk_upsert_companies(to_insert)

    uid_to_id = {r["uid"]: r["id"] for r in rows}
    sources = [
        {"company_id": uid_to_id[c["uid"]], "origination": "latent", "source_name": "zefix"}
        for c in to_insert
        if c["uid"] in uid_to_id
    ]
    bulk_upsert_sources(sources)
    return len(rows)


def _process_zefix(
    new_companies: list[dict],
    known_uids: set[str],
    canton_filter: list[str] | None = None,
) -> int:
    """Legacy: schreibt vorgeladene Firmen via Bulk-Insert. Returns Anzahl inserted."""
    if not new_companies:
        return 0
    return _flush_zefix_batch(new_companies)


# ── Broker-Verarbeitung (Ebene 2) ─────────────────────────────────────────────

def _broker_uid(url: str) -> str:
    """Stabiler synthetischer UID aus Listing-URL (keine Zefix-CHE-Nummern)."""
    return "broker-" + hashlib.md5(url.encode()).hexdigest()[:16]


def _process_broker_listings(listings: list[dict], source_name: str) -> int:
    """
    Schreibt Broker-Inserate als Ebene-2-Firmen in Supabase.
    Verwendet synthetische UIDs (broker-{hash}) für idempotente Upserts.
    Returns Anzahl neu eingefügter Einträge.
    """
    if not listings:
        return 0

    today   = date.today().isoformat()
    db      = get_db()
    inserted = 0

    for item in listings:
        url  = item.get("external_ref", "")
        name = item.get("name", "")
        if not name or not url:
            continue

        uid = _broker_uid(url)

        # Company upsert (idempotent via synthetischer UID)
        res = (
            db.table("companies")
            .upsert({
                "uid":        uid,
                "name":       name,
                "canton":     item.get("canton"),
                "legal_form": item.get("rechtsform"),
                "branche":    item.get("branche"),
                "status":     "angereichert",  # Broker-Listings haben schon Enrichment via Inserat
            }, on_conflict="uid")
            .select("id")
            .execute()
        )
        if not res.data:
            continue
        cid = res.data[0]["id"]

        # Source-Eintrag: origination=listed, external_ref=Listing-URL
        db.table("company_sources").upsert({
            "company_id":   cid,
            "origination":  "listed",
            "source_name":  source_name,
            "external_ref": url,
            "listed_since": today,
        }, on_conflict="company_id,source_name").execute()

        # Enrichment: auf_plattform=True + verfügbare Kennzahlen
        enrich: dict = {"company_id": cid, "auf_plattform": True}
        if item.get("umsatz_est_chf"):
            enrich["umsatz_est_chf"] = item["umsatz_est_chf"]
        if item.get("mitarbeiter_est"):
            enrich["mitarbeiter_est"] = item["mitarbeiter_est"]
        db.table("enrichment").upsert(enrich, on_conflict="company_id").execute()

        inserted += 1

    return inserted


# ── Public API ────────────────────────────────────────────────────────────────

def run(canton_filter: list[str] | None = None) -> dict:
    """
    Vollständiger Radar-Lauf. Gibt Statistiken zurück.
    canton_filter: optionale Liste von Kantonen für schnellen Test (z.B. ["ZH","BE"])
    """
    log.info("=== Radar: Start ===")

    # Erstlauf erkennen
    total_existing = _count_companies()
    is_first_run   = total_existing == 0
    shab_days      = FIRST_RUN_SHAB_DAYS if is_first_run else NORMAL_SHAB_DAYS

    if is_first_run:
        log.info(f"Radar: Erstlauf erkannt — lade {shab_days} Tage SHAB-History")

    # UIDs vorladen
    known_uids = _load_known_uids()
    log.info(f"Radar: {len(known_uids)} UIDs bereits bekannt")

    # ── 1. SHAB ──────────────────────────────────────────────────────────────
    log.info(f"--- Stufe 1/3: SHAB (letzte {shab_days} Tage) ---")
    shab_signals = shab_scan(days_back=shab_days)
    shab_neu, shab_update = _process_shab(shab_signals, known_uids)
    log.info(f"SHAB fertig: {shab_neu} neue Firmen, {shab_update} Rücktritts-Signale gesetzt")

    # ── 2. Zefix Delta ───────────────────────────────────────────────────────
    log.info("--- Stufe 2/3: Zefix Delta-Scan (Streaming-Batches à 5000) ---")
    zefix_inserted = 0
    from checkpoint import CheckpointRun

    with CheckpointRun("zefix", total=72000) as ckpt:
        resume_cursor = ckpt.resume_cursor
        if resume_cursor:
            log.info(f"Zefix: Resume ab Cursor {resume_cursor}")

        def _on_batch(batch: list[dict]) -> None:
            nonlocal zefix_inserted
            n = _flush_zefix_batch(batch)
            zefix_inserted += n
            log.info(f"Zefix: Batch geschrieben ● {n} Firmen, {zefix_inserted} total")

        def _on_cursor(cursor: str) -> None:
            ckpt.resume_cursor = cursor
            ckpt._save()

        remaining = scan_delta(
            known_uids=known_uids,
            canton_filter=canton_filter,
            on_batch=_on_batch,
            on_cursor=_on_cursor,
            batch_size=5_000,
            resume_cursor=resume_cursor,
        )
        zefix_inserted += _process_zefix(remaining, known_uids)

    log.info(f"Zefix fertig: {zefix_inserted} neue Firmen total")

    # ── 3. Broker-Connectors (Ebene 2) — alle 8 Plattformen ─────────────────
    log.info(f"--- Stufe 3/3: Broker-Connectors ({len(BROKER_CONNECTORS)} Plattformen) ---")
    known_broker_refs = _load_known_broker_refs()
    log.info(f"Broker: {len(known_broker_refs)} Inserate bereits bekannt")

    broker_stats: dict[str, int] = {}
    broker_total = 0

    for connector in BROKER_CONNECTORS:
        if not connector.get("active", True):
            continue
        source_name = connector["name"]
        fn          = connector["fn"]
        try:
            listings    = fn(known_refs=known_broker_refs)
            # Normalize format (new connectors return different keys than old ones)
            normalized = []
            for item in listings:
                normalized.append({
                    "name":        item.get("title") or item.get("name", ""),
                    "external_ref": item.get("url") or item.get("external_ref", ""),
                    "canton":      item.get("canton"),
                    "branche":     item.get("branche"),
                    "rechtsform":  item.get("rechtsform"),
                    "umsatz_est_chf": item.get("umsatz_est_chf"),
                    "mitarbeiter_est": item.get("mitarbeiter_est"),
                })
            inserted = _process_broker_listings(normalized, source_name)
            broker_stats[source_name] = inserted
            broker_total += inserted
            log.info(f"{source_name}: {inserted} neue Inserate")
        except Exception as e:
            log.error(f"{source_name} Fehler: {e}")
            broker_stats[source_name] = 0

    log.info(f"Broker fertig: {broker_total} neue Inserate total")

    total_new = shab_neu + zefix_inserted + broker_total
    log.info(f"=== Radar fertig: {total_new} neue Firmen total ===")

    return {
        "shab_neu":      shab_neu,
        "shab_updates":  shab_update,
        "zefix_neu":     zefix_inserted,
        "broker_neu":    broker_total,
        "broker_detail": broker_stats,
        "total_neu":     total_new,
    }
