# Deal Origination Platform — Projektgedächtnis

## Zweck
KI-Daemon für Off-Market-M&A-Origination Schweiz. Läuft täglich, automatisch.
Zwei Ebenen (latent + listed), EIN Scoring-Core.

## Eiserne Regeln
- Bewertungskern existiert genau einmal; beide Quellen nutzen ihn.
- Config ist single source of truth, versioniert. Prompt ändert nie direkt —
  immer Prompt → LLM-Diff → Bestätigung → neue Version.
- Teil-1-Dossier (intern) verlässt nie das System. Teil-2 (Inhaber) ohne
  Preis/Score/Schwäche. Outreach nie auto-versandt — Approval-Queue.
- Vor NDA sind alle Zahlen Schätzungen (Konfidenz A/B/C). Kein DD-Ersatz.

## Stack
Next.js 15 + TS + Tailwind + shadcn · Supabase (Postgres) · Python-Scoring
· Inngest · ScrapeGraphAI · Resend · Vercel.

## Repo-Struktur
```
deal-origination/
├── apps/web/           # Next.js 15 — Dashboard + API
├── services/pipeline/  # Python — Scoring, Radar, Enrichment, Outreach
├── db/                 # Schema + Seed-SQLs
└── packages/shared/    # Geteilte TS-Types
```

## Datenmodell
companies · company_sources · enrichment · scores · gates ·
config_versions · decisions · outreach. (siehe db/schema.sql)

## Scoring
Nachfolge × Investierbarkeit / 100. 5 KO-Gates (binär, rot = raus):
Inhaberabh · Klumpen · AI-Disruption(1–5) · Markt · Bilanz.
Gewichte aus aktiver config_version.

## Config-Flow
Prompt → api/config/interpret (LLM, JSON-only) → Diff-Vorschau
→ Mensch bestätigt → neue config_versions-Zeile (active=true).
Alte Version bleibt erhalten. Rollback = vorherige Version aktivieren.

## Design
Tokens in apps/web/styles/tokens.css.
Ebene 1 Off-Market = grün/teal (--l1). Ebene 2 On-Market = indigo/blau (--l2).
Thermoskala als Marken-Motiv (Header-Gradient).
IBM Plex Sans (UI) · IBM Plex Mono (Zahlen). Ruhige Operator-Konsole.
Navigation: Header immer Home; jedes Untermenü hat Zurück + Breadcrumb.
Score-Farbe: ≥60 grün · 45–59 amber · <45 grau.

## Komponenten (eigene, auf shadcn-Basis)
GateDots · ScorePill · SourceDot · CriteriaDrawer · ScoreDrawer
ConfigDiff · BackNav · Breadcrumb

## API-Routen
GET/POST /api/companies · GET /api/companies/[id]
GET/POST /api/config · POST /api/config/interpret
POST /api/decisions · GET/POST /api/outreach

## Cron-Takt (Inngest)
06:00 radar · 07:00 enrichment · 08:00 scoring · 08:30 dossier · 09:00 digest

## Fertige Komponenten

**Frontend (apps/web/)**
- `app/(dashboard)/page.tsx` — Qualified-Liste mit Filter, Stats, Drawers
- `app/(dashboard)/firma/[id]/page.tsx` — Company Detail (3-col: Stamm|Enrich|Score)
- `app/(dashboard)/queue/page.tsx` — Morning Queue (Approve/Reject)
- `app/(dashboard)/kriterien/page.tsx` — Config Tuning mit LLM-Diff
- `app/login/page.tsx` — Auth (Supabase SSR)
- `middleware.ts` — Auth-Guard, Redirect → /login

**API-Routen (apps/web/app/api/)**
- `companies/route.ts` + `companies/[id]/route.ts`
- `config/route.ts` + `config/interpret/route.ts`
- `decisions/route.ts` · `outreach/route.ts`
- `auth/signout/route.ts`
- `inngest/route.ts` (Crons: radar, enrichment, scoring, dossier, digest, dedup)

**Pipeline (services/pipeline/)**
- `agents/radar.py` — SHAB + Zefix Delta-Scan (Streaming à 5000) + Broker-Connectors
- `agents/enrichment.py` — Website-Scraping + Claude Haiku
- `agents/scoring.py` — Bewertungskern
- `agents/dossier.py` — Briefentwurf (TEIL2-Regeln)
- `agents/digest.py` — Tagesübersicht
- `dedup.py` — Normalisierungs-Dedup
- `server.py` — HTTP-Server Port 8000
- `connectors/broker_companymarket.py` — Ebene 2: companymarket.ch (~280 CH-Inserate, 29 Seiten)
- `connectors/broker_firmenboerse.py` — Ebene 2: firmenboerse.com (CH-Inserate, AJAX-Pagination)

## Setup (einmalig)
1. `ANTHROPIC_API_KEY` in `.env.local` setzen
2. `python scripts/setup_auth_user.py` — Supabase Auth User anlegen
3. `db/rls_policies.sql` in Supabase SQL-Editor ausführen
4. Pipeline starten: `cd services/pipeline && python server.py`

## Bei Entscheidungen
Aktualisiere CLAUDE.md entsprechend.
