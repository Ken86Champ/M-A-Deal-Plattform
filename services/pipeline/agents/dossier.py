"""
Dossier Agent — Step 10.
Läuft täglich 08:30, nach Scoring.

Eiserne Regeln:
  - Teil 1 (intern): Scores, Korridor, Gates, Schwächen — verlässt NIE das System.
  - Teil 2 (Inhaber): Neutrale Standortbestimmung — KEIN Preis, KEIN Score, KEINE Schwäche.
  - Outreach wird NIE automatisch versandt — immer Morning-Queue zuerst.

Ablauf pro qualified-Firma ohne pending/approved Outreach:
  1. Lade alle Firmendaten (company + enrichment + scores + gates)
  2. Generiere Teil-2-Briefentwurf via Claude Sonnet
  3. Schreibe in outreach-Tabelle (status='pending')
"""
import logging
import os
import re

from anthropic import Anthropic
from db import get_db, get_enrichment

log = logging.getLogger(__name__)
_anthropic = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))

# ── Teil-2-System-Prompt (Standortbestimmung) ─────────────────────────────────

TEIL2_SYSTEM = """Du schreibst einen diskreten, respektvollen Erstkontakt-Brief auf Deutsch (Schweizer Hochdeutsch) für einen M&A-Berater.

EISERNE REGELN — NIEMALS verletzen:
- Kein Kaufpreis, kein Schätzwert, keine Bewertungsformel
- Kein Score, keine Ranking-Zahl
- Keine Schwäche der Firma, kein Kritikpunkt
- Keine Erwähnung von Datenbanken, Plattformen oder Screening
- Keine aufdringliche Formulierung, kein Druck

Tonalität:
- Persönlich, kollegial, auf Augenhöhe
- Diskretion ist selbstverständlich (nicht explizit erwähnen — wirkt gegenteilig)
- Fokus: wir interessieren uns für ihr Lebenswerk, nicht für ein Objekt
- Schweizer Stil: sachlich, direkt, ohne Floskeln

Struktur (ca. 200–250 Wörter):
1. Persönliche Anrede (Vorname wenn bekannt, sonst "Sehr geehrte Damen und Herren")
2. Kurze Vorstellung (10X Group, M&A-Boutique, KMU-Schwerpunkt Schweiz)
3. Warum wir schreiben: Nachfolgethema ist zeitlos, wir suchen langfristige Partnerschaft
4. Konkreter nächster Schritt: unverbindliches Gespräch
5. Grussformel + Kontakt

Gib NUR den Brieftext zurück (kein Subject, kein "Betreff:", keine Markdown-Formatierung)."""


def _build_context(company: dict, enrichment: dict | None, scores: list[dict], gates: list[dict]) -> str:
    """Assembles non-sensitive context for LLM prompt (Teil 2 — no scores, no prices)."""
    e = enrichment or {}
    ctx_parts = [
        f"Firmenname: {company.get('name')}",
        f"Kanton: {company.get('canton') or '–'}",
        f"Rechtsform: {company.get('legal_form') or '–'}",
        f"Branche/Zweck: {company.get('purpose') or '–'}",
        f"Gründungsjahr: {company.get('founded_year') or '–'}",
    ]
    if e.get("inhaber_name"):
        ctx_parts.append(f"Inhaber/GF: {e['inhaber_name']}")
    if e.get("mitarbeiter_est"):
        ctx_parts.append(f"Mitarbeiterzahl (Schätzung): {e['mitarbeiter_est']}")
    return "\n".join(ctx_parts)


def _generate_letter(company: dict, enrichment: dict | None,
                     scores: list[dict], gates: list[dict]) -> str:
    """Generate Teil-2-Brief via Claude. Falls back to template if LLM unavailable."""
    context = _build_context(company, enrichment, scores, gates)
    inhaber = (enrichment or {}).get("inhaber_name")
    anrede = f"Sehr geehrter Herr/Frau {inhaber.split()[-1]}" if inhaber else "Sehr geehrte Damen und Herren"

    user_msg = f"""Firmenkontext:
{context}

Erstelle einen Erstkontakt-Brief. Beginne mit: "{anrede}"."""

    try:
        resp = _anthropic.messages.create(
            model="claude-sonnet-5",
            max_tokens=600,
            system=TEIL2_SYSTEM,
            messages=[{"role": "user", "content": user_msg}],
        )
        return resp.content[0].text.strip()
    except Exception as e:
        log.warning(f"LLM Briefgenerierung fehlgeschlagen für {company.get('name')}: {e}")
        return _fallback_letter(company, inhaber)


def _fallback_letter(company: dict, inhaber_name: str | None) -> str:
    """Simple template when Claude is unavailable."""
    name = company.get("name", "Ihr Unternehmen")
    nachname = inhaber_name.split()[-1] if inhaber_name else None
    anrede = f"Sehr geehrter Herr/Frau {nachname}" if nachname else "Sehr geehrte Damen und Herren"

    return f"""{anrede}

Mein Name ist Ken Buser, ich bin Gründer der 10X Group, einer auf KMU-Nachfolgen spezialisierten M&A-Boutique in der Schweiz.

Im Rahmen unserer laufenden Suche nach nachhaltig geführten Schweizer Unternehmen sind wir auf {name} aufmerksam geworden. Was uns besonders angesprochen hat, ist die Kontinuität und der erkennbare Aufbau, den Sie in Ihrem Unternehmen über die Jahre geleistet haben.

Das Thema Nachfolge stellt sich früher oder später für jedes inhabergeführte Unternehmen — und wir begleiten Inhaber diskret und auf Augenhöhe durch diesen Prozess. Ohne Druck, ohne Verpflichtung.

Ich würde mich freuen, wenn wir uns für ein unverbindliches Gespräch von 30 Minuten zusammenfinden könnten — persönlich oder telefonisch, ganz wie es Ihnen passt.

Mit freundlichen Grüssen

Ken Buser
10X Group AG
10xgroup.swiss@gmail.com"""


def run(limit: int = 50) -> None:
    log.info("Dossier: Start")
    db = get_db()

    # Qualified companies without existing outreach
    res = db.table("companies").select("*").eq("status", "qualified").execute()
    qualified = res.data or []
    log.info(f"Dossier: {len(qualified)} qualified Firmen")

    if not qualified:
        log.info("Dossier: Nichts zu tun")
        return

    # Load existing outreach company_ids to avoid duplicates
    existing = db.table("outreach").select("company_id").execute()
    existing_ids = {r["company_id"] for r in (existing.data or [])}

    to_process = [c for c in qualified if c["id"] not in existing_ids][:limit]
    log.info(f"Dossier: {len(to_process)} ohne Outreach → generiere Briefe")

    for i, company in enumerate(to_process, 1):
        cid = company["id"]
        try:
            enrichment = get_enrichment(cid)
            scores_res = db.table("scores").select("*").eq("company_id", cid).execute()
            gates_res  = db.table("gates").select("*").eq("company_id", cid).execute()

            letter = _generate_letter(
                company, enrichment,
                scores_res.data or [],
                gates_res.data or [],
            )

            db.table("outreach").insert({
                "company_id":   cid,
                "status":       "pending",
                "kanal":        "brief",
                "letter_draft": letter,
            }).execute()

            log.info(f"[{i}/{len(to_process)}] Brief erstellt: {company['name']}")
        except Exception as e:
            log.warning(f"[{i}/{len(to_process)}] Fehler bei {company['name']}: {e}")

    log.info("Dossier: Fertig")
