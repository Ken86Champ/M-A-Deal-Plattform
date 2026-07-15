# M&A Deal Origination Platform

KI-gestützter Daemon für Off-Market-M&A-Origination in der Schweiz. Läuft täglich vollautomatisch und identifiziert Nachfolge-Kandidaten auf zwei Ebenen.

## Überblick

| Ebene | Quelle | Farbe |
|-------|--------|-------|
| 1 – Off-Market | SHAB, Zefix, Eigenrecherche | Grün/Teal |
| 2 – On-Market | companymarket.ch, firmenboerse.com | Indigo/Blau |

Ein gemeinsamer Scoring-Kern bewertet beide Ebenen: **Nachfolge × Investierbarkeit / 100**, gefiltert durch 5 binäre KO-Gates.

## Stack

- **Frontend** — Next.js 15 · TypeScript · Tailwind CSS · shadcn/ui
- **Backend** — Supabase (Postgres) · Inngest (Cron-Jobs)
- **Pipeline** — Python · ScrapeGraphAI · Claude Haiku (Anthropic)
- **Outreach** — Resend · Approval-Queue (kein Auto-Versand)
- **Deployment** — Vercel

## Projektstruktur

```
deal-origination/
├── apps/web/           # Next.js 15 — Dashboard + API-Routen
├── services/pipeline/  # Python — Scoring, Radar, Enrichment, Outreach
├── db/                 # Schema, RLS-Policies, Seed-SQL
└── packages/shared/    # Geteilte TypeScript-Types
```

## Setup

### Voraussetzungen
- Node.js 18+
- Python 3.11+
- Supabase-Projekt (URL + Anon-Key)
- Anthropic API-Key

### 1. Umgebungsvariablen

Datei `apps/web/.env.local` anlegen:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ANTHROPIC_API_KEY=...
INNGEST_SIGNING_KEY=...
INNGEST_EVENT_KEY=...
RESEND_API_KEY=...
```

### 2. Datenbank

```sql
-- In Supabase SQL-Editor ausführen:
-- 1. db/schema.sql
-- 2. db/seed_config.sql
-- 3. db/rls_policies.sql
```

### 3. Auth-User anlegen

```bash
python scripts/setup_auth_user.py
```

### 4. Frontend starten

```bash
cd apps/web
npm install
npm run dev
# → http://localhost:3001
```

### 5. Pipeline starten

```bash
cd services/pipeline
pip install -r requirements.txt
python server.py
# → http://localhost:8000
```

## Cron-Takt (Inngest)

| Zeit  | Job        | Beschreibung                        |
|-------|------------|-------------------------------------|
| 06:00 | radar      | SHAB/Zefix Delta-Scan + Broker-Feed |
| 07:00 | enrichment | Website-Scraping + Claude Haiku     |
| 08:00 | scoring    | Bewertungskern                      |
| 08:30 | dossier    | Briefentwurf (Teil 1 & 2)           |
| 09:00 | digest     | Tagesübersicht per E-Mail           |

## Scoring

```
Score = (Nachfolge-Score × Investierbarkeits-Score) / 100
```

**KO-Gates** (binär — rot = ausgeschlossen):
1. Inhaberabhängigkeit
2. Kundenklumpen
3. AI-Disruption (Skala 1–5)
4. Marktattraktivität
5. Bilanzqualität

Score-Farben: ≥ 60 grün · 45–59 amber · < 45 grau

## Sicherheit

- Kein Auto-Versand von Outreach — immer Approval-Queue
- Teil-1-Dossier (intern, mit Score/Schwächen) verlässt nie das System
- Teil-2-Brief (für Inhaber) enthält keinen Preis, Score oder Schwäche
- Alle Zahlen vor NDA sind Schätzungen (Konfidenz A/B/C)

## Lizenz

Proprietär — alle Rechte vorbehalten.
