-- Deal Origination Platform — Database Schema
-- Supabase / Postgres

-- ── Extensions ───────────────────────────────────────────────────────────────

create extension if not exists "uuid-ossp";

-- ── Companies ─────────────────────────────────────────────────────────────────

create table if not exists companies (
  id            uuid primary key default gen_random_uuid(),
  uid           text unique,                        -- CHE-Nummer (Zefix)
  name          text not null,
  canton        text,
  legal_form    text,
  founded_year  int,
  branche       text,
  purpose       text,                               -- Zefix-Zweck
  status        text not null default 'neu'
                  check (status in (
                    'neu','angereichert','bewertet',
                    'qualified','verworfen'
                  )),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_companies_status  on companies (status);
create index if not exists idx_companies_canton  on companies (canton);
create index if not exists idx_companies_uid     on companies (uid);

-- ── Company Sources ───────────────────────────────────────────────────────────
-- Eine Firma kann in BEIDEN Ebenen auftauchen.

create table if not exists company_sources (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id) on delete cascade,
  origination   text not null check (origination in ('latent','listed')),
  source_name   text not null,     -- 'shab' | 'zefix' | 'business-broker.ch' | …
  external_ref  text,              -- Inserat-URL / SHAB-Meldungs-ID
  listed_since  date,              -- nur listed: Markt-Eintritt (Gegen-Signal)
  first_seen    timestamptz not null default now(),
  unique (company_id, source_name)
);

create index if not exists idx_sources_company   on company_sources (company_id);
create index if not exists idx_sources_origin    on company_sources (origination);

-- ── Enrichment ────────────────────────────────────────────────────────────────
-- Angereicherte Signale je Firma, mit Konfidenz-Labels A|B|C.

create table if not exists enrichment (
  company_id              uuid primary key references companies(id) on delete cascade,
  inhaber_name            text,
  inhaber_alter           int,      inhaber_alter_conf     char(1),
  kein_nachfolger         boolean,  kein_nachfolger_conf   char(1),
  shab_ruecktritt         boolean,
  web_last_update_years   numeric,
  personenname_in_name    boolean,
  team_seite_tiefe        numeric,  -- 0..1
  wiederkehr_signal       numeric,  -- 0..1
  kundendiversifikation   numeric,  -- 0..1
  umsatz_est_chf          bigint,   umsatz_conf            char(1),
  ebitda_marge_est        numeric,
  mitarbeiter_est         int,
  auf_plattform           boolean not null default false,
  enriched_at             timestamptz not null default now()
);

-- ── Scores ────────────────────────────────────────────────────────────────────
-- Versioniert je Config-Lauf; kombinibar mit historischen Vergleichen.

create table if not exists scores (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references companies(id) on delete cascade,
  nachfolge       numeric not null,
  investierbar    numeric not null,
  combined        numeric not null,
  config_version  int not null,
  computed_at     timestamptz not null default now()
);

create index if not exists idx_scores_company  on scores (company_id);
create index if not exists idx_scores_combined on scores (combined desc);

-- ── KO-Gates ──────────────────────────────────────────────────────────────────
-- 5 Zeilen je Firma; ein 'rot' = verworfen.

create table if not exists gates (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  gate         text not null
                 check (gate in ('inhaberabh','klumpen','ai_disrupt','markt','bilanz')),
  status       text not null
                 check (status in ('gruen','gelb','rot','offen')),
  begruendung  text,
  unique (company_id, gate)
);

create index if not exists idx_gates_company on gates (company_id);
create index if not exists idx_gates_status  on gates (status);

-- ── Config Versions ───────────────────────────────────────────────────────────
-- Single source of truth, versioniert. Genau eine aktive Version.

create table if not exists config_versions (
  version      int primary key,
  payload      jsonb not null,
  created_by   text,              -- 'prompt' | 'manual'
  prompt_text  text,              -- der Prompt, der diese Version erzeugte
  active       boolean not null default false,
  created_at   timestamptz not null default now()
);

-- Exakt eine aktive Config erzwingen
create unique index if not exists one_active_config
  on config_versions (active)
  where active = true;

-- ── Decisions ─────────────────────────────────────────────────────────────────

create table if not exists decisions (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  kind         text not null check (kind in ('ansprechen','spaeter','weg')),
  reason       text,              -- bei 'weg': zu_klein|personenabh|branche|bauchgefuehl
  decided_at   timestamptz not null default now()
);

create index if not exists idx_decisions_company on decisions (company_id);

-- ── Outreach ──────────────────────────────────────────────────────────────────

create table if not exists outreach (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id) on delete cascade,
  status        text not null default 'pending'
                  check (status in ('pending','approved','sent','replied')),
  kanal         text check (kanal in ('brief','email')),
  letter_draft  text,
  follow_up_due date,
  created_at    timestamptz not null default now()
);

create index if not exists idx_outreach_status on outreach (status);

-- ── updated_at trigger ────────────────────────────────────────────────────────

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger companies_updated_at
  before update on companies
  for each row execute function set_updated_at();

-- ── Row-Level Security ────────────────────────────────────────────────────────
-- Aktivieren; Policies werden via Supabase Dashboard oder Migration hinzugefügt.

alter table companies         enable row level security;
alter table company_sources   enable row level security;
alter table enrichment        enable row level security;
alter table scores            enable row level security;
alter table gates             enable row level security;
alter table config_versions   enable row level security;
alter table decisions         enable row level security;
alter table outreach          enable row level security;
