"""
Scoring Agent — Step 3 (Briefing).
Läuft täglich 08:00. Liest aktive config_version, ruft scoring_engine.run_pipeline().
"""
import logging
from db import get_db, get_active_config, get_companies_by_status, update_company_status

log = logging.getLogger(__name__)


def run(statuses: list[str] | None = None) -> None:
    log.info("Scoring: Start")

    config = get_active_config()
    log.info(f"Scoring: Config v{config.get('version', '?')} geladen")

    target = statuses or ["angereichert"]
    companies: list[dict] = []
    for st in target:
        companies.extend(get_companies_by_status(st))
    log.info(f"Scoring: {len(companies)} Firmen ({', '.join(target)})")

    if not companies:
        log.info("Scoring: Nichts zu tun")
        return

    from scoring_engine import run_pipeline
    results = run_pipeline(companies, config)

    log.info(f"Scoring: {len(results)} Firmen verarbeitet")
