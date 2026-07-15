"""Supabase client for the Python pipeline service."""
import os
from supabase import create_client, Client

_url  = os.environ.get("SUPABASE_URL") or os.environ["NEXT_PUBLIC_SUPABASE_URL"]
_key  = os.environ["SUPABASE_SERVICE_ROLE_KEY"]  # pipeline always uses service role

_client: Client | None = None


def get_db() -> Client:
    global _client
    if _client is None:
        _client = create_client(_url, _key)
    return _client


def get_active_config() -> dict:
    """Returns the payload of the active config_version."""
    db = get_db()
    res = db.table("config_versions").select("*").eq("active", True).single().execute()
    if not res.data:
        raise RuntimeError("No active config_version found. Run db/seed_config.sql first.")
    return res.data["payload"]


def upsert_company(uid: str, name: str, canton: str | None = None, **kwargs) -> dict:
    """Insert or update a company by UID. Returns the row."""
    db = get_db()
    data = {"uid": uid, "name": name, "canton": canton, **kwargs}
    res = (
        db.table("companies")
        .upsert(data, on_conflict="uid")
        .select()
        .execute()
    )
    return res.data[0]


def update_company_status(company_id: str, status: str) -> None:
    db = get_db()
    db.table("companies").update({"status": status}).eq("id", company_id).execute()


def upsert_source(company_id: str, origination: str, source_name: str, **kwargs) -> None:
    db = get_db()
    data = {
        "company_id": company_id,
        "origination": origination,
        "source_name": source_name,
        **kwargs,
    }
    db.table("company_sources").upsert(data, on_conflict="company_id,source_name").execute()


def upsert_enrichment(company_id: str, fields: dict) -> None:
    db = get_db()
    db.table("enrichment").upsert(
        {"company_id": company_id, **fields},
        on_conflict="company_id",
    ).execute()


def write_score(company_id: str, nachfolge: float, investierbar: float,
                combined: float, config_version: int) -> None:
    db = get_db()
    db.table("scores").insert({
        "company_id":     company_id,
        "nachfolge":      nachfolge,
        "investierbar":   investierbar,
        "combined":       combined,
        "config_version": config_version,
    }).execute()


def upsert_gate(company_id: str, gate: str, status: str, begruendung: str | None = None) -> None:
    db = get_db()
    db.table("gates").upsert(
        {"company_id": company_id, "gate": gate, "status": status, "begruendung": begruendung},
        on_conflict="company_id,gate",
    ).execute()


def bulk_upsert_companies(companies: list[dict], batch_size: int = 500) -> list[dict]:
    """
    Bulk upsert companies by UID. Returns list of inserted/updated rows with IDs.
    Uses batched requests to stay within Supabase payload limits.
    """
    db = get_db()
    all_rows: list[dict] = []
    for i in range(0, len(companies), batch_size):
        batch = companies[i:i + batch_size]
        res = (
            db.table("companies")
            .upsert(batch, on_conflict="uid")
            .select("id,uid")
            .execute()
        )
        all_rows.extend(res.data or [])
    return all_rows


def bulk_upsert_sources(sources: list[dict], batch_size: int = 500) -> None:
    """Bulk upsert company_sources. sources = list of {company_id, origination, source_name}."""
    db = get_db()
    for i in range(0, len(sources), batch_size):
        batch = sources[i:i + batch_size]
        db.table("company_sources").upsert(batch, on_conflict="company_id,source_name").execute()


def get_companies_by_status(status: str) -> list[dict]:
    db = get_db()
    res = db.table("companies").select("*").eq("status", status).execute()
    return res.data or []


def get_enrichment(company_id: str) -> dict | None:
    db = get_db()
    res = db.table("enrichment").select("*").eq("company_id", company_id).execute()
    return res.data[0] if res.data else None
