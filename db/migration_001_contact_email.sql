-- ── Migration: contact_email + outreach erweitern ─────────────────────────────
-- Ausführen in: Supabase Dashboard → SQL Editor → Run

-- 1. Enrichment: Kontakt-E-Mail aus Impressum-Crawl
ALTER TABLE enrichment
  ADD COLUMN IF NOT EXISTS contact_email        text,
  ADD COLUMN IF NOT EXISTS contact_email_source text;

COMMENT ON COLUMN enrichment.contact_email        IS 'E-Mail aus Impressum-Crawl (Enrichment-Agent)';
COMMENT ON COLUMN enrichment.contact_email_source IS 'Quelle: Impressum | Website | Plattform';

-- 2. Outreach: Versand-Details
ALTER TABLE outreach
  ADD COLUMN IF NOT EXISTS recipient_email text,
  ADD COLUMN IF NOT EXISTS recipient_name  text,
  ADD COLUMN IF NOT EXISTS sender_email    text,
  ADD COLUMN IF NOT EXISTS sender_name     text,
  ADD COLUMN IF NOT EXISTS sent_at         timestamptz;

-- 3. Index für E-Mail-Lookup
CREATE INDEX IF NOT EXISTS idx_enrichment_contact_email ON enrichment (contact_email)
  WHERE contact_email IS NOT NULL;

-- Fertig
SELECT 'Migration abgeschlossen ✓' AS status;
