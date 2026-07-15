"""
Pipeline entry point.

Cron-Takt:
  06:00  radar.run()
  07:00  enrichment.run()
  08:00  scoring.run()
  08:30  dossier.run()
  09:00  digest.send()

Lokal: python main.py --stage radar|enrichment|scoring|dossier|all
"""
import argparse
import logging
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../../.env.local"))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger("pipeline")


def run_stage(stage: str) -> None:
    if stage == "radar":
        from agents.radar import run as radar_run
        radar_run()
    elif stage == "enrichment":
        from agents.enrichment import run as enrich_run
        enrich_run()
    elif stage == "scoring":
        from agents.scoring import run as score_run
        score_run()
    elif stage == "dossier":
        from agents.dossier import run as dossier_run
        dossier_run()
    elif stage == "digest":
        from agents.digest import run as digest_run
        digest_run()
    elif stage == "dedup":
        from dedup import merge_duplicates
        n = merge_duplicates(dry_run=False)
        log.info(f"Dedup: {n} Duplikate gemerged")
    elif stage == "process":
        # Verarbeite bestehende Firmen ohne neuen Scan (enrichment → scoring → digest)
        log.info("=== Pipeline: Verarbeiten (ohne Radar) ===")
        for s in ("enrichment", "scoring", "digest"):
            log.info(f"--- Stufe: {s} ---")
            run_stage(s)
        log.info("=== Verarbeitung abgeschlossen ===")
    elif stage == "broker":
        # Broker-Scan (Ebene 2) + sofortiges Scoring — kein Zefix
        log.info("=== Broker-Pipeline: Scan → Score ===")
        from agents.radar import _load_known_broker_refs, _process_broker_listings
        from connectors.broker_companymarket import scan as cm_scan
        from connectors.broker_firmenboerse import scan as fb_scan
        known = _load_known_broker_refs()
        log.info(f"Broker: {len(known)} Inserate bereits bekannt")
        cm_listings = cm_scan(known_external_refs=known)
        cm_n = _process_broker_listings(cm_listings, "companymarket.ch")
        log.info(f"companymarket.ch: {cm_n} neue Inserate")
        fb_listings = fb_scan(known_external_refs=known)
        fb_n = _process_broker_listings(fb_listings, "firmenboerse.com")
        log.info(f"firmenboerse.com: {fb_n} neue Inserate")
        total_new = cm_n + fb_n
        log.info(f"=== Scan fertig: {total_new} neue Inserate ===")
        # Sofort-Scoring: alle angereichert-Broker-Inserate scoren (unabhängig davon ob neu)
        log.info("=== Auto-Scoring aller Broker-Inserate ===")
        from agents.scoring import run as score_run
        score_run()
        log.info("=== Broker-Pipeline fertig — Inbox aktuell ===")
    elif stage == "all":
        log.info("=== Pipeline: alle Stufen ===")
        for s in ("radar", "dedup", "enrichment", "scoring", "dossier", "digest"):
            log.info(f"--- Stufe: {s} ---")
            run_stage(s)
        log.info("=== Pipeline abgeschlossen ===")
    else:
        raise ValueError(f"Unbekannte Stufe: {stage}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Deal Origination Pipeline")
    parser.add_argument(
        "--stage",
        choices=["radar", "enrichment", "scoring", "dossier", "digest", "dedup", "process", "broker", "all"],
        default="all",
    )
    parser.add_argument(
        "--canton",
        nargs="+",
        help="Nur diese Kantone scannen (Test, z.B. --canton ZH BE)",
        default=None,
    )
    args = parser.parse_args()

    if args.stage == "radar":
        from agents.radar import run as radar_run
        radar_run(canton_filter=args.canton)
    else:
        run_stage(args.stage)
