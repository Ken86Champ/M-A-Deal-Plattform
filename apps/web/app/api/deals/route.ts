import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import type { Deal, DealType, DealStatus, PipelineStage, ScoreBreakdown } from '@/lib/mock-data'

// Maps Supabase company/enrichment/score rows → frontend Deal shape
function mapToDeal(row: any): Deal {
  const enrichment   = row.enrichment?.[0] ?? {}
  const latestScore  = (row.scores ?? []).sort(
    (a: any, b: any) => new Date(b.computed_at).getTime() - new Date(a.computed_at).getTime()
  )[0] ?? null
  const sources      = row.company_sources ?? []
  const gates        = row.gates ?? []
  const decisions    = row.decisions ?? []

  // Origination: 'listed' = On-Market, 'latent' = Off-Market
  const isOnMarket   = sources.some((s: any) => s.origination === 'listed') || enrichment.auf_plattform
  const type: DealType = isOnMarket ? 'on-market' : 'off-market'

  // Listing URL for on-market deals
  const listingSource = sources.find((s: any) => s.origination === 'listed')
  const listingUrl    = listingSource?.external_ref ?? undefined
  const listingPlatform = listingSource?.source_name ?? undefined

  // Score
  const score = latestScore ? Math.round(latestScore.combined ?? 0) : 0
  const nachfolge   = latestScore ? Math.round(latestScore.nachfolge ?? 50) : 50
  const investierbar = latestScore ? Math.round(latestScore.investierbar ?? 50) : 50

  // Derive score breakdown — map 2 real scores to 5 categories
  const scoreBreakdown: ScoreBreakdown = {
    strategicFit:       Math.round((nachfolge + investierbar) / 2),
    companyQuality:     investierbar,
    salesProbability:   nachfolge,
    outreachPotential:  isOnMarket ? 88 : Math.min(90, nachfolge + 10),
    dataQuality:        enrichment.website_url ? 75 : (isOnMarket ? 60 : 40),
  }

  // Confidence based on data quality
  const confidence = enrichment.website_url ? 'B' : (isOnMarket ? 'B' : 'C')

  // Pipeline stage from decisions
  const latestDecision = decisions.sort(
    (a: any, b: any) => new Date(b.decided_at).getTime() - new Date(a.decided_at).getTime()
  )[0]
  let pipelineStage: PipelineStage = 'new-qualified'
  let status: DealStatus           = 'new'
  if (latestDecision?.kind === 'ansprechen') { pipelineStage = 'outreach-ready'; status = 'outreach-ready' }
  if (latestDecision?.kind === 'spaeter')    { pipelineStage = 'in-review';      status = 'reviewed'       }
  if (latestDecision?.kind === 'weg')        { pipelineStage = 'rejected';        status = 'rejected'       }

  // Signals from enrichment
  const signals: string[] = []
  if (enrichment.shab_ruecktritt)                      signals.push('SHAB: Rücktritts-Signal registriert')
  if (enrichment.inhaber_alter && enrichment.inhaber_alter >= 60) signals.push(`Inhaber geschätzt ${enrichment.inhaber_alter} Jahre`)
  if (enrichment.personenname_in_name)                 signals.push('Personenname im Firmennamen')
  if (enrichment.kein_nachfolger === true)             signals.push('Kein Nachfolger erkennbar')
  if (enrichment.web_last_update_years && enrichment.web_last_update_years > 3)
    signals.push(`Website ~${Math.round(enrichment.web_last_update_years)} Jahre nicht aktualisiert`)
  if (enrichment.wiederkehr_signal && enrichment.wiederkehr_signal > 0.6) signals.push('Wiederkehrender Umsatz erkennbar')
  if (isOnMarket) signals.push('Öffentlich zum Verkauf inseriert')
  if (!signals.length) signals.push('Zefix-Eintrag — AG/GmbH Schweiz')

  // Red flags from gates
  const redFlags: string[] = gates
    .filter((g: any) => g.status === 'rot')
    .map((g: any) => g.begruendung ?? g.gate_name)
  if (!latestScore)                     redFlags.push('Noch nicht bewertet — Scoring ausstehend')
  else if (!redFlags.length && score < 50) redFlags.push('Score unter 50 — tiefe Qualifikation')

  // Deal reason
  let dealReason = isOnMarket
    ? `Auf ${listingPlatform ?? 'Plattform'} inseriert — Inhaber sucht Käufer`
    : enrichment.shab_ruecktritt
      ? 'SHAB: Rücktritts-Signal — möglicher Nachfolgebedarf'
      : enrichment.inhaber_alter >= 60
        ? `Inhaber ~${enrichment.inhaber_alter} Jahre — latentes Nachfolgerisiko`
        : 'Latentes Target — Zefix/SHAB-Screening'

  // Industry: branche from company, fallback to purpose snippet
  const industry = row.branche ?? (row.purpose ? row.purpose.slice(0, 60) : 'Nicht klassifiziert')

  // Sources for display
  const sourceLabels = sources.map((s: any) => s.source_name ?? s.origination).filter(Boolean)
  if (!sourceLabels.length) sourceLabels.push('Zefix')

  return {
    id:              row.id,
    name:            row.name,
    legalForm:       row.legal_form ?? '–',
    canton:          row.canton ?? '–',
    industry,
    website:         enrichment.website_url ?? undefined,
    listingUrl,
    listingPlatform,
    type,
    score,
    confidence,
    status,
    pipelineStage,
    dealReason,
    founded:         row.founded_year ?? undefined,
    employees:       enrichment.mitarbeiter_est ?? undefined,
    revenueChf:      enrichment.umsatz_est_chf ?? undefined,
    ebitdaChf:       enrichment.ebitda_est_chf ?? undefined,
    summary:         row.purpose ? row.purpose.slice(0, 300) : `${row.name} — ${row.legal_form ?? ''} ${row.canton ?? ''}`.trim(),
    dealHypothesis:  signals.join(' · '),
    outreachAngle:   isOnMarket
      ? `Direktkontakt über ${listingPlatform ?? 'Plattform'}. Interesse signalisieren, Gespräch vereinbaren.`
      : 'Persönliches Schreiben an Inhaber — Nachfolgethematik und Kontinuität.',
    signals,
    redFlags,
    sources:         sourceLabels,
    scoreBreakdown,
    createdAt:       (row.created_at ?? row.updated_at ?? '').slice(0, 10),
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const type    = searchParams.get('type')    // 'off-market' | 'on-market' | null
  const status  = searchParams.get('status')  // 'active' | 'all' | null
  const canton  = searchParams.get('canton')  // 'ZH' | 'BE' | ... | null  → server-side DB filter
  const branche = searchParams.get('branche') // free text → ilike filter on branche column

  try {
    const isFiltered = !!(canton || branche)

    let query = supabaseAdmin
      .from('companies')
      .select(`
        *,
        company_sources (*),
        enrichment (*),
        scores (id, nachfolge, investierbar, combined, config_version, computed_at),
        gates (*),
        decisions (*)
      `)
      .in('status', ['qualified', 'bewertet'])

    // Server-side filters — applied before the LIMIT so all matching rows are returned
    if (canton)  query = query.eq('canton', canton)
    if (branche) query = query.ilike('branche', `%${branche}%`)

    query = query
      .order('updated_at', { ascending: false })
      .range(0, isFiltered ? 4999 : 999)

    const { data, error } = await query
    if (error) throw error

    let deals = (data ?? []).map(mapToDeal)

    if (type === 'off-market') deals = deals.filter(d => d.type === 'off-market')
    if (type === 'on-market')  deals = deals.filter(d => d.type === 'on-market')
    if (status === 'active')   deals = deals.filter(d => d.status !== 'rejected')

    deals.sort((a, b) => b.score - a.score)

    return NextResponse.json(deals)
  } catch (err: any) {
    console.error('[api/deals]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
