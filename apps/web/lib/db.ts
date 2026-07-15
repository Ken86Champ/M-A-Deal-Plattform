import { createClient } from '@supabase/supabase-js'
import type {
  Company, CompanySource, Enrichment, Score, Gate,
  ConfigVersion, Decision, Outreach,
} from '@shared/types'

// ── Client instances ──────────────────────────────────────────────────────────

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const svc  = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Browser-safe (RLS-enforced)
export const supabase = createClient(url, anon)

// Server-only (bypasses RLS — use only in Route Handlers / Server Actions)
export const supabaseAdmin = createClient(url, svc, {
  auth: { persistSession: false },
})

// ── Company queries ───────────────────────────────────────────────────────────

export async function getQualifiedList(options?: {
  origination?: 'latent' | 'listed'
  limit?: number
  statuses?: string[]
}): Promise<(Company & { sources: CompanySource[]; latestScore: Score | null; gates: Gate[] })[]> {
  const statuses = options?.statuses ?? ['qualified', 'bewertet']

  // Use !inner join when filtering by origination so only matching companies are returned
  const sourcesSelect = options?.origination
    ? 'company_sources!inner(*)'
    : 'company_sources(*)'

  let query = supabaseAdmin
    .from('companies')
    .select(`
      *,
      ${sourcesSelect},
      scores (id, nachfolge, investierbar, combined, config_version, computed_at),
      gates (*)
    `)
    .in('status', statuses)
    .order('updated_at', { ascending: false })
    .limit(options?.limit ?? 500)

  if (options?.origination) {
    query = query.eq('company_sources.origination', options.origination)
  }

  const { data, error } = await query
  if (error) throw error

  return (data ?? []).map((row: any) => ({
    ...row,
    sources: row.company_sources ?? [],
    latestScore: (row.scores as Score[]).sort(
      (a, b) => new Date(b.computed_at).getTime() - new Date(a.computed_at).getTime()
    )[0] ?? null,
    gates: row.gates ?? [],
  }))
}

export async function getCompanyFull(id: string) {
  const { data, error } = await supabaseAdmin
    .from('companies')
    .select(`
      *,
      company_sources (*),
      enrichment (*),
      scores (id, nachfolge, investierbar, combined, config_version, computed_at),
      gates (*),
      decisions (*)
    `)
    .eq('id', id)
    .single()

  if (error) throw error

  return {
    ...data,
    sources: data.company_sources ?? [],
    latestScore: (data.scores as Score[]).sort(
      (a, b) => new Date(b.computed_at).getTime() - new Date(a.computed_at).getTime()
    )[0] ?? null,
    gates: data.gates ?? [],
    latestDecision: (data.decisions as Decision[]).sort(
      (a, b) => new Date(b.decided_at).getTime() - new Date(a.decided_at).getTime()
    )[0] ?? null,
  }
}

// ── Config queries ────────────────────────────────────────────────────────────

export async function getActiveConfig(): Promise<ConfigVersion | null> {
  const { data, error } = await supabaseAdmin
    .from('config_versions')
    .select('*')
    .eq('active', true)
    .single()

  if (error) return null
  return data as ConfigVersion
}

export async function createConfigVersion(
  payload: ConfigVersion['payload'],
  promptText: string | null,
  createdBy: 'prompt' | 'manual'
): Promise<ConfigVersion> {
  // Get current max version
  const { data: latest } = await supabaseAdmin
    .from('config_versions')
    .select('version')
    .order('version', { ascending: false })
    .limit(1)
    .single()

  const nextVersion = ((latest as any)?.version ?? 0) + 1

  // Deactivate all (the unique index allows only one active anyway)
  await supabaseAdmin.from('config_versions').update({ active: false }).eq('active', true)

  const { data, error } = await supabaseAdmin
    .from('config_versions')
    .insert({
      version:      nextVersion,
      payload,
      created_by:   createdBy,
      prompt_text:  promptText,
      active:       true,
    })
    .select()
    .single()

  if (error) throw error
  return data as ConfigVersion
}

// ── Decision mutations ────────────────────────────────────────────────────────

export async function saveDecision(
  companyId: string,
  kind: 'ansprechen' | 'spaeter' | 'weg',
  reason?: string
): Promise<Decision> {
  const { data, error } = await supabaseAdmin
    .from('decisions')
    .insert({ company_id: companyId, kind, reason })
    .select()
    .single()

  if (error) throw error
  return data as Decision
}

// ── Outreach queries ──────────────────────────────────────────────────────────

export async function getOutreachQueue(status?: string) {
  let q = supabaseAdmin
    .from('outreach')
    .select('*, companies (name, canton, branche)')
    .order('created_at', { ascending: false })

  if (status) q = q.eq('status', status)

  const { data, error } = await q
  if (error) throw error
  return data ?? []
}
