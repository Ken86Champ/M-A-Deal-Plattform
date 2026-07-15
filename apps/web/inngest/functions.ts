import { inngest } from './client'

const PIPELINE_URL = process.env.PIPELINE_URL ?? 'http://localhost:8000'

async function callPipeline(stage: string): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(`${PIPELINE_URL}/run/${stage}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    signal:  AbortSignal.timeout(10 * 60 * 1000),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Pipeline stage "${stage}" fehlgeschlagen: ${text}`)
  }
  return res.json()
}

// ── 05:30 Broker-Only Scan (täglich, vor Radar) ───────────────────────────────
// Scannt alle On-Market-Plattformen + scored sofort → Inbox aktuell vor 06:00

export const brokerCron = inngest.createFunction(
  {
    id:       'broker-daily',
    name:     'Broker — On-Market Plattformen täglich',
    triggers: [{ cron: 'TZ=Europe/Zurich 30 5 * * *' }],
  },
  async ({ step }) => {
    return step.run('broker', () => callPipeline('broker'))
  }
)

// ── 06:00 Radar ───────────────────────────────────────────────────────────────

export const radarCron = inngest.createFunction(
  {
    id:       'radar-daily',
    name:     'Radar — Zefix + SHAB täglich',
    triggers: [{ cron: 'TZ=Europe/Zurich 0 6 * * *' }],
  },
  async ({ step }) => {
    return step.run('radar', () => callPipeline('radar'))
  }
)

// ── 07:00 Enrichment ──────────────────────────────────────────────────────────

export const enrichmentCron = inngest.createFunction(
  {
    id:       'enrichment-daily',
    name:     'Enrichment — Website + CRIF täglich',
    triggers: [{ cron: 'TZ=Europe/Zurich 0 7 * * *' }],
  },
  async ({ step }) => {
    return step.run('enrichment', () => callPipeline('enrichment'))
  }
)

// ── 08:00 Scoring ─────────────────────────────────────────────────────────────

export const scoringCron = inngest.createFunction(
  {
    id:       'scoring-daily',
    name:     'Scoring — Bewertungskern täglich',
    triggers: [{ cron: 'TZ=Europe/Zurich 0 8 * * *' }],
  },
  async ({ step }) => {
    return step.run('scoring', () => callPipeline('scoring'))
  }
)

// ── 08:30 Dossier ─────────────────────────────────────────────────────────────

export const dossierCron = inngest.createFunction(
  {
    id:       'dossier-daily',
    name:     'Dossier — Briefentwürfe für Queue',
    triggers: [{ cron: 'TZ=Europe/Zurich 30 8 * * *' }],
  },
  async ({ step }) => {
    return step.run('dossier', () => callPipeline('dossier'))
  }
)

// ── 09:00 Digest ──────────────────────────────────────────────────────────────

export const digestCron = inngest.createFunction(
  {
    id:       'digest-daily',
    name:     'Digest — Tagesübersicht Morning-Queue',
    triggers: [{ cron: 'TZ=Europe/Zurich 0 9 * * *' }],
  },
  async ({ step }) => {
    return step.run('digest', () => callPipeline('digest'))
  }
)

// ── Sonntag 09:00 Dedup ───────────────────────────────────────────────────────

export const dedupCron = inngest.createFunction(
  {
    id:       'dedup-weekly',
    name:     'Dedup — wöchentlich Sonntag 09:00',
    triggers: [{ cron: 'TZ=Europe/Zurich 0 9 * * 0' }],
  },
  async ({ step }) => {
    return step.run('dedup', () => callPipeline('dedup'))
  }
)
