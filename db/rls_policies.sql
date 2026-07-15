-- RLS Policies — Deal Origination Platform
-- Ausführen in Supabase SQL-Editor (Dashboard → SQL).
--
-- Strategie:
--   • service_role (Python-Pipeline): umgeht RLS automatisch → kein Policy nötig
--   • authenticated (eingeloggte Browser-User): volles CRUD
--   • anon (nicht eingeloggt): kein Zugriff
--
-- Iron Rule: diese Policies NACH Aktivierung von RLS in Supabase Dashboard einrichten.

-- ── 1. RLS aktivieren ─────────────────────────────────────────────────────────

alter table companies        enable row level security;
alter table company_sources  enable row level security;
alter table enrichment       enable row level security;
alter table scores           enable row level security;
alter table gates            enable row level security;
alter table config_versions  enable row level security;
alter table decisions        enable row level security;
alter table outreach         enable row level security;

-- ── 2. Alte Dev-Policies entfernen (falls vorhanden) ─────────────────────────

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'companies','company_sources','enrichment','scores',
    'gates','config_versions','decisions','outreach'
  ] loop
    begin
      execute format('drop policy if exists "dev_full_access" on %I', tbl);
    exception when others then null;
    end;
  end loop;
end;
$$;

-- ── 3. Authenticated-User-Policies ───────────────────────────────────────────
-- Eine Policy pro Tabelle: authenticated User darf alles.

create policy "auth_full_access" on companies
  for all to authenticated
  using (true)
  with check (true);

create policy "auth_full_access" on company_sources
  for all to authenticated
  using (true)
  with check (true);

create policy "auth_full_access" on enrichment
  for all to authenticated
  using (true)
  with check (true);

create policy "auth_full_access" on scores
  for all to authenticated
  using (true)
  with check (true);

create policy "auth_full_access" on gates
  for all to authenticated
  using (true)
  with check (true);

create policy "auth_full_access" on config_versions
  for all to authenticated
  using (true)
  with check (true);

create policy "auth_full_access" on decisions
  for all to authenticated
  using (true)
  with check (true);

create policy "auth_full_access" on outreach
  for all to authenticated
  using (true)
  with check (true);

-- ── Ergebnis ──────────────────────────────────────────────────────────────────
-- anon: kein Zugriff (keine Policy → RLS blockiert)
-- authenticated: volles CRUD (Policy oben)
-- service_role: umgeht RLS automatisch (Python-Pipeline, Admin-APIs)
