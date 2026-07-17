-- ── Pipeline Checkpoints — Resume-System ─────────────────────────────────────
-- Führt jeden Pipeline-Lauf als wiederaufnehmbaren Job.
-- Ausführen in: Supabase Dashboard → SQL Editor → Run

-- 1. Checkpoint-Tabelle
CREATE TABLE IF NOT EXISTS pipeline_runs (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  stage          TEXT    NOT NULL,                -- 'enrichment' | 'scoring' | 'radar' | 'all'
  status         TEXT    NOT NULL DEFAULT 'running'
                         CHECK (status IN ('running','done','interrupted','error')),
  started_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed      INT     DEFAULT 0,
  total          INT,
  last_id        TEXT,                            -- last processed company.id (UUID as text)
  last_cursor    TEXT,                            -- Zefix: last prefix/canton position
  metadata       JSONB   DEFAULT '{}'::JSONB
);

-- 2. Index für schnelles Suchen nach Stage + Status
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_stage_status
  ON pipeline_runs (stage, status, started_at DESC);

-- 3. Auto-update updated_at
CREATE OR REPLACE FUNCTION pipeline_runs_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER pipeline_runs_updated_at
  BEFORE UPDATE ON pipeline_runs
  FOR EACH ROW EXECUTE FUNCTION pipeline_runs_updated_at();

-- 4. Helper-Funktion: letzten abgebrochenen Lauf holen
CREATE OR REPLACE FUNCTION get_resumable_run(p_stage TEXT)
RETURNS TABLE (
  run_id      UUID,
  last_id     TEXT,
  last_cursor TEXT,
  processed   INT,
  total       INT
)
LANGUAGE SQL AS $$
  SELECT id, last_id, last_cursor, processed, total
  FROM   pipeline_runs
  WHERE  stage  = p_stage
  AND    status IN ('running', 'interrupted')
  ORDER  BY started_at DESC
  LIMIT  1;
$$;

-- Fertig
SELECT 'Checkpoint-System installiert ✓' AS status;
