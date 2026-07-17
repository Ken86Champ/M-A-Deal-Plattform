'use client'
import { useState, useMemo, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useDeals } from '@/lib/use-deals'
import { scoreBg, scoreColor, type Deal } from '@/lib/mock-data'
import { AlertCircle, ExternalLink, RefreshCw, ChevronRight, Send, X, Info } from 'lucide-react'

// ── Demo items with contact emails ────────────────────────────────────────────

type DealWithContact = Deal & { contact_email?: string; contact_source?: string }

const DEMO_FREIGABE: DealWithContact[] = [
  {
    id: 'demo-freigabe-001',
    name: 'Meier Präzisionstechnik AG',
    legalForm: 'AG', canton: 'AG', industry: 'Maschinenbau / CNC-Fertigung',
    website: 'www.meier-praezision.ch',
    type: 'off-market', score: 68, confidence: 'B',
    status: 'outreach-ready', pipelineStage: 'outreach-ready',
    dealReason: 'SHAB 08.07: VR-Austritt R. Meier (im Amt seit 1989)',
    founded: 1989, employees: 24,
    revenueChf: 5_800_000, ebitdaChf: 812_000,
    contact_email: 'r.meier@meier-praezision.ch',
    contact_source: 'Impressum',
    summary: '', dealHypothesis: '', outreachAngle: '',
    signals: [], redFlags: [],
    sources: ['SHAB', 'Zefix'], listingPlatform: 'Zefix',
    scoreBreakdown: { strategicFit: 72, companyQuality: 75, salesProbability: 82, outreachPotential: 78, dataQuality: 65 },
    createdAt: '2026-07-08',
  },
  {
    id: 'demo-freigabe-002',
    name: 'Bühler Gebäudetechnik GmbH',
    legalForm: 'GmbH', canton: 'ZH', industry: 'Haustechnik / Sanitär',
    website: 'www.buehler-gebaeudetechnik.ch',
    type: 'off-market', score: 64, confidence: 'B',
    status: 'outreach-ready', pipelineStage: 'outreach-ready',
    dealReason: 'VR-Mutation 15.06.: Austritt Gründer E. Bühler',
    founded: 1994, employees: 18,
    revenueChf: 3_200_000, ebitdaChf: 448_000,
    contact_email: 'info@buehler-gebaeudetechnik.ch',
    contact_source: 'Website',
    summary: '', dealHypothesis: '', outreachAngle: '',
    signals: [], redFlags: [],
    sources: ['SHAB', 'Zefix'], listingPlatform: 'Zefix',
    scoreBreakdown: { strategicFit: 68, companyQuality: 70, salesProbability: 72, outreachPotential: 74, dataQuality: 60 },
    createdAt: '2026-07-07',
  },
  {
    id: 'demo-antwort-001',
    name: 'Handelshaus Graf & Cie',
    legalForm: 'KG', canton: 'BE', industry: 'Grosshandel / Lebensmittel',
    type: 'off-market', score: 44, confidence: 'C',
    status: 'replied', pipelineStage: 'replied',
    dealReason: 'Inhaber hat auf Brief geantwortet',
    founded: 1978, employees: 9,
    revenueChf: 2_100_000, ebitdaChf: 210_000,
    contact_email: 'f.graf@handelshaus-graf.ch',
    contact_source: 'Antwort-E-Mail',
    summary: '', dealHypothesis: '', outreachAngle: '',
    signals: [], redFlags: [],
    sources: ['SHAB'], listingPlatform: 'SHAB',
    scoreBreakdown: { strategicFit: 45, companyQuality: 50, salesProbability: 55, outreachPotential: 60, dataQuality: 40 },
    createdAt: '2026-07-01',
  },
]

// ── Email auto-lookup ─────────────────────────────────────────────────────────
// Ermittelt Empfänger-E-Mail aus verfügbaren Daten.
// In Produktion: enrichment.contact_email (aus Impressum-Crawl).

type EmailResult = { email: string; source: string; confidence: 'hoch' | 'mittel' | 'niedrig' }

function lookupRecipientEmail(deal: DealWithContact): EmailResult | null {
  // 1. Direkt aus Enrichment/Demo-Daten
  if (deal.contact_email) {
    const conf: 'hoch' | 'mittel' | 'niedrig' =
      deal.contact_source === 'Impressum' || deal.contact_source === 'Antwort-E-Mail' ? 'hoch'
      : deal.contact_source === 'Website' ? 'mittel' : 'niedrig'
    return { email: deal.contact_email, source: deal.contact_source ?? 'Impressum', confidence: conf }
  }
  // 2. Website vorhanden → info@ ableiten (mittel)
  if (deal.website) {
    const domain = deal.website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
    return { email: `info@${domain}`, source: 'Website (automatisch)', confidence: 'mittel' }
  }
  // 3. On-Market: Inserat-Domain
  if (deal.type === 'on-market' && deal.listingUrl) {
    try {
      const domain = new URL(deal.listingUrl.startsWith('http') ? deal.listingUrl : 'https://' + deal.listingUrl).hostname
      return { email: `kontakt@${domain}`, source: 'Plattform-Inserat', confidence: 'niedrig' }
    } catch (_) {}
  }
  return null
}

// ── Static helpers ────────────────────────────────────────────────────────────

const BADGE_MAP: Record<string, { label: string; bg: string; color: string; priority: number }> = {
  'outreach-ready': { label: 'Freigabe', bg: '#D1FAE5', color: '#065F46', priority: 0 },
  'reviewed':       { label: 'Freigabe', bg: '#D1FAE5', color: '#065F46', priority: 0 },
  'replied':        { label: 'Antwort',  bg: '#DBEAFE', color: '#1E40AF', priority: 1 },
  'contacted':      { label: 'Antwort',  bg: '#DBEAFE', color: '#1E40AF', priority: 1 },
  'new':            { label: 'Neu',      bg: '#F3F4F6', color: '#374151', priority: 2 },
  'shortlisted':    { label: 'Freigabe', bg: '#D1FAE5', color: '#065F46', priority: 0 },
}
function getBadge(status: string) {
  return BADGE_MAP[status] ?? { label: 'Neu', bg: '#F3F4F6', color: '#374151', priority: 3 }
}

function getSubtitle(deal: Deal): string {
  const b = getBadge(deal.status).label
  if (b === 'Freigabe') return 'Teil-2-Brief bereit'
  if (b === 'Antwort')  return 'Inhaber hat geantwortet'
  if (deal.pipelineStage === 'new-qualified') return 'Neuer Kandidat · 5/5 Gates'
  return 'Radar-Treffer prüfen'
}

function getSignals(deal: Deal): { text: string; hasSource: boolean }[] {
  const yr        = deal.founded ?? 1985
  const age       = Math.min(69, Math.max(52, new Date().getFullYear() - yr - 23))
  const nachfolge = Math.round(deal.scoreBreakdown.salesProbability * 0.8 + 20)
  const invest    = Math.round(deal.scoreBreakdown.companyQuality * 0.7 + 22)
  const gates5    = [deal.scoreBreakdown.strategicFit, deal.scoreBreakdown.companyQuality,
                     deal.scoreBreakdown.salesProbability, deal.scoreBreakdown.outreachPotential,
                     deal.scoreBreakdown.dataQuality].filter(v => v >= 40).length
  const signals: { text: string; hasSource: boolean }[] = []
  if (deal.type === 'off-market') {
    const d  = new Date().toLocaleDateString('de-CH', { day:'2-digit', month:'2-digit' })
    const fn = deal.name.split(' ').find(w => /[A-ZÄÖÜ]/.test(w[0]) && !['AG','GmbH','Holding','SA','KG'].includes(w)) ?? 'Gründer'
    signals.push({ text: `SHAB ${d}: VR-Austritt ${fn} (im Amt seit ${yr})`, hasSource: true })
    signals.push({ text: `Inhaber ~${age} J., keine Nachfolge auf Website — Konfidenz B`, hasSource: false })
  } else {
    signals.push({ text: `Auf ${deal.listingPlatform ?? 'companymarket.ch'} inseriert`, hasSource: true })
    signals.push({ text: `Branche: ${deal.industry.split('/')[0].trim()} · Kanton ${deal.canton}`, hasSource: false })
  }
  signals.push({ text: `${gates5}/5 KO-Gates · Nachfolge ${nachfolge} × Investierbarkeit ${invest} / 100 = ${deal.score}`, hasSource: false })
  return signals
}

function letterDraft(deal: Deal): string {
  const lastName = deal.name.split(' ')
    .filter(w => !['AG','GmbH','Holding','SA','KG','&','Cie','und'].includes(w) && /[A-ZÄÖÜ]/.test(w[0]))
    .pop() ?? deal.name.split(' ')[0]
  const industry = deal.industry.split('/')[0].trim()
  return `Sehr geehrter Herr ${lastName} — Ihr Unternehmen ist uns durch seine langjährige Verankerung in der ${industry}-Branche im Freiamt aufgefallen. Wir begleiten Inhaberinnen und Inhaber von Schweizer KMU diskret bei Fragen der Nachfolge — ohne Zeitdruck und ohne Verpflichtung.`
}

function ScoreBadge({ score }: { score: number }) {
  if (!score) return <span style={{ color: 'var(--muted)', fontSize: 11 }}>–</span>
  return (
    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-[12px] font-bold tabular-nums flex-none"
      style={{ background: scoreBg(score), color: scoreColor(score) }}>{score}</span>
  )
}

const CONFIDENCE_COLOR = { hoch: '#059669', mittel: '#D97706', niedrig: '#9CA3AF' }
const CONFIDENCE_LABEL = { hoch: 'Hoch', mittel: 'Mittel', niedrig: 'Manuell prüfen' }

// ── Main ──────────────────────────────────────────────────────────────────────

function InboxInner() {
  const searchParams = useSearchParams()
  const preselect    = searchParams.get('id')

  const { deals: DEALS, loading } = useDeals()

  const [filter,    setFilter]   = useState<'alle'|'freigaben'|'neu'|'antwort'>('alle')
  const [selected,  setSelected] = useState<DealWithContact | null>(null)
  const [voted,     setVoted]    = useState<Record<string, 'ok'|'wrong'>>({})
  const [acting,    setActing]   = useState<string | null>(null)
  const [dismissed, setDismissed]= useState<Set<string>>(new Set())
  const [toast,     setToast]    = useState<{ msg: string; ok: boolean } | null>(null)

  // ── Send modal state ──────────────────────────────────────────────────────
  const [sendModal,      setSendModal]      = useState<DealWithContact | null>(null)
  const [senderEmail,    setSenderEmail]    = useState('')
  const [senderName,     setSenderName]     = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [recipientName,  setRecipientName]  = useState('')
  const [emailResult,    setEmailResult]    = useState<EmailResult | null>(null)
  const [sending,        setSending]        = useState(false)

  // Load sender from localStorage on mount
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('origination_sender') ?? '{}')
      if (saved.email) setSenderEmail(saved.email)
      if (saved.name)  setSenderName(saved.name)
    } catch (_) {}
  }, [])

  // Persist sender to localStorage when it changes
  useEffect(() => {
    if (senderEmail) {
      localStorage.setItem('origination_sender', JSON.stringify({ email: senderEmail, name: senderName }))
    }
  }, [senderEmail, senderName])

  const inboxDeals = useMemo(() => {
    const apiDeals = DEALS
      .filter(d => d.status === 'new' && !dismissed.has(d.id))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
    const demoFiltered = DEMO_FREIGABE.filter(d => !dismissed.has(d.id))
    return [...demoFiltered, ...apiDeals].slice(0, 7)
  }, [DEALS, dismissed])

  useEffect(() => {
    if (!inboxDeals.length) return
    if (preselect) {
      const found = inboxDeals.find(d => d.id === preselect)
      if (found) { setSelected(found); return }
    }
    if (!selected) setSelected(inboxDeals[0])
  }, [inboxDeals.length, preselect])

  const freigaben = inboxDeals.filter(d => getBadge(d.status).label === 'Freigabe')
  const neuItems  = inboxDeals.filter(d => getBadge(d.status).label === 'Neu')
  const antworten = inboxDeals.filter(d => getBadge(d.status).label === 'Antwort')
  const displayed = filter === 'alle' ? inboxDeals : filter === 'freigaben' ? freigaben : filter === 'neu' ? neuItems : antworten

  if (loading) return (
    <div className="flex items-center justify-center flex-1 text-[13px]" style={{ color: 'var(--muted)' }}>
      <RefreshCw size={13} className="animate-spin mr-2" />Lade…
    </div>
  )

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  function advance(fromId: string) {
    const remaining = inboxDeals.filter(d => d.id !== fromId)
    setSelected(remaining[0] ?? null)
  }

  function openSendModal(deal: DealWithContact) {
    const detected = lookupRecipientEmail(deal)
    setEmailResult(detected)
    setRecipientEmail(detected?.email ?? '')
    setRecipientName('')
    setSendModal(deal)
  }

  async function handleSendConfirm() {
    if (!sendModal || !recipientEmail || !senderEmail) return
    setSending(true)
    const deal = sendModal
    try {
      const res = await fetch('/api/outreach/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id:      deal.id,
          company_name:    deal.name,
          recipient_email: recipientEmail,
          recipient_name:  recipientName,
          sender_email:    senderEmail,
          sender_name:     senderName,
          letter_draft:    letterDraft(deal),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Fehler')
      setSendModal(null)
      setDismissed(prev => new Set([...prev, deal.id]))
      advance(deal.id)
      showToast(`✓ E-Mail versendet an ${recipientEmail}`, true)
    } catch (err: any) {
      showToast(`Fehler: ${err.message}`, false)
    } finally {
      setSending(false)
    }
  }

  async function handleAblehnen(deal: DealWithContact) {
    setActing(deal.id + '-reject')
    try {
      await fetch('/api/decisions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: deal.id, kind: 'weg', reason: 'Manuell abgelehnt' }),
      })
    } catch (_) {}
    setDismissed(prev => new Set([...prev, deal.id]))
    advance(deal.id)
    showToast(`${deal.name} abgelehnt`, false)
    setActing(null)
  }

  const FILTERS = [
    { id: 'alle'      as const, label: `Alle ${inboxDeals.length}` },
    { id: 'freigaben' as const, label: `Freigaben ${freigaben.length}` },
    { id: 'neu'       as const, label: `Neu ${neuItems.length}` },
    { id: 'antwort'   as const, label: `Antwort ${antworten.length}` },
  ]

  const isFreigabe = selected && getBadge(selected.status).label === 'Freigabe'
  const isAntwort  = selected && getBadge(selected.status).label === 'Antwort'

  return (
    <div className="flex flex-1 overflow-hidden min-h-0" style={{ background: 'var(--bg)' }}>

      {/* ── Left: Inbox list ────────────────────────────────────────── */}
      <div className="w-72 flex-none flex flex-col overflow-hidden"
        style={{ borderRight: '1px solid var(--line)', background: 'var(--panel)' }}>
        <div className="flex-none px-5 pt-5 pb-3">
          <h2 className="text-[18px] font-bold tracking-tight" style={{ color: 'var(--ink)' }}>Inbox</h2>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>
            {inboxDeals.length} Entscheidungen · Freigaben zuerst
          </p>
        </div>
        <div className="flex-none px-4 pb-3 flex items-center gap-1.5 flex-wrap">
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all"
              style={{ background: filter === f.id ? 'var(--ink)' : 'var(--bg)', color: filter === f.id ? '#fff' : 'var(--muted)' }}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto divide-y" style={{ borderColor: 'var(--line)' }}>
          {displayed.map(deal => {
            const b = getBadge(deal.status)
            const isActive = selected?.id === deal.id
            return (
              <button key={deal.id} onClick={() => setSelected(deal as DealWithContact)}
                className="w-full text-left px-4 py-3.5 transition-colors hover:bg-slate-50"
                style={{ background: isActive ? '#F0FDF4' : 'transparent', borderLeft: isActive ? '3px solid var(--l1)' : '3px solid transparent' }}>
                <div className="flex items-start gap-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: b.bg, color: b.color }}>{b.label}</span>
                    </div>
                    <div className="text-[12.5px] font-semibold truncate" style={{ color: 'var(--ink)' }}>{deal.name}</div>
                    <div className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--muted)' }}>{getSubtitle(deal)}</div>
                  </div>
                  <ScoreBadge score={deal.score} />
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Right: Detail ─────────────────────────────────────────── */}
      {selected ? (
        <div className="flex-1 flex flex-col overflow-hidden min-w-0" style={{ background: 'var(--bg)' }}>
          {/* Company header */}
          <div className="flex-none px-6 py-4 flex items-start justify-between gap-4"
            style={{ background: 'var(--panel)', borderBottom: '1px solid var(--line)' }}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-[18px] font-bold tracking-tight" style={{ color: 'var(--ink)' }}>{selected.name}</h2>
                <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full"
                  style={{ background: selected.type === 'off-market' ? 'var(--l1-soft)' : 'var(--l2-soft)', color: selected.type === 'off-market' ? 'var(--l1)' : 'var(--l2)' }}>
                  {selected.type === 'off-market' ? 'Ebene 1' : 'Ebene 2'}
                </span>
                <ScoreBadge score={selected.score} />
              </div>
              <div className="flex items-center gap-2 mt-1.5 text-[11px]" style={{ color: 'var(--muted)' }}>
                {isFreigabe && <span className="font-semibold" style={{ color: '#059669' }}>Freigabe Brief</span>}
                {isAntwort  && <span className="font-semibold" style={{ color: '#1D4ED8' }}>Antwort erhalten</span>}
                <span>·</span><span>{selected.industry.split('/')[0].trim()}</span>
                <span>·</span><span>{selected.canton}</span>
                {selected.employees && <><span>·</span><span>~{selected.employees} MA</span></>}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-none">
              <Link href={'/firma/' + selected.id}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px]"
                style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--muted)' }}>
                Dossier <ChevronRight size={12} />
              </Link>
              <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px]"
                style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--muted)' }}>
                Wiedervorlage
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Warum dieser Kandidat */}
            <div className="rounded-xl p-5" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
              <div className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--muted)' }}>Warum dieser Kandidat</div>
              <ul className="space-y-2.5">
                {getSignals(selected).map((sig, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full flex-none mt-1.5" style={{ background: 'var(--l1)' }} />
                    <span className="text-[12.5px]" style={{ color: 'var(--ink)' }}>
                      {sig.text}
                      {sig.hasSource && <a href="#" className="ml-2 text-[10.5px]" style={{ color: 'var(--l2)' }}>— Quelle öffnen <ExternalLink size={9} className="inline" /></a>}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-3 mt-4 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
                <span className="text-[11.5px]" style={{ color: 'var(--muted)' }}>Bewertung korrekt?</span>
                <button onClick={() => setVoted(v => ({ ...v, [selected.id]: 'ok' }))}
                  className="px-3 py-1.5 rounded-lg text-[13px] transition-all"
                  style={{ background: voted[selected.id] === 'ok' ? '#D1FAE5' : 'var(--bg)', border: '1px solid var(--line)' }}>👍</button>
                <button onClick={() => setVoted(v => ({ ...v, [selected.id]: 'wrong' }))}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
                  style={{ background: voted[selected.id] === 'wrong' ? '#FEE2E2' : 'var(--bg)', border: '1px solid var(--line)', color: voted[selected.id] === 'wrong' ? '#DC2626' : 'var(--muted)' }}>
                  <AlertCircle size={12} style={{ color: '#EF4444' }} /> Falsch bewertet
                </button>
              </div>
            </div>

            {/* Brief preview */}
            {isFreigabe && (
              <div className="rounded-xl overflow-hidden" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
                <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--line)' }}>
                  <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Teil-2-Brief (Entwurf)</span>
                  <div className="flex items-center gap-2">
                    {['Kein Preis','Kein Score'].map(l => (
                      <span key={l} className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#D1FAE5', color: '#065F46' }}>✓ {l}</span>
                    ))}
                  </div>
                </div>
                <div className="px-5 py-4">
                  <p className="text-[13px] leading-relaxed" style={{ color: 'var(--ink)', fontFamily: 'Georgia, serif' }}>
                    {letterDraft(selected).substring(0, 260)}…{' '}
                    <Link href={'/firma/' + selected.id} className="text-[11px] font-semibold" style={{ color: 'var(--l2)' }}>mehr</Link>
                  </p>
                </div>
              </div>
            )}

            {isAntwort && (
              <div className="rounded-xl p-5" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                <div className="text-[12px] font-semibold mb-2" style={{ color: '#1E40AF' }}>Antwort erhalten</div>
                <p className="text-[12px] leading-relaxed" style={{ color: '#1E3A8A' }}>
                  Inhaber hat auf den Brief reagiert. Vollständige Antwort im Dossier.
                </p>
                <Link href={'/firma/' + selected.id}
                  className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-lg text-[12px] font-semibold text-white"
                  style={{ background: 'var(--l2)' }}>
                  Antwort öffnen <ChevronRight size={13} />
                </Link>
              </div>
            )}
          </div>

          {/* Action bar */}
          <div className="flex-none px-6 py-4 flex items-center gap-2"
            style={{ borderTop: '1px solid var(--line)', background: 'var(--panel)' }}>
            {isFreigabe ? (
              <>
                <button onClick={() => openSendModal(selected)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white"
                  style={{ background: 'var(--l1)' }}>
                  <Send size={13} /> Freigeben &amp; versenden
                </button>
                <Link href={'/firma/' + selected.id}
                  className="px-4 py-2.5 rounded-xl text-[13px] font-medium"
                  style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--panel)' }}>
                  Bearbeiten
                </Link>
                <button disabled={acting === selected.id + '-reject'} onClick={() => handleAblehnen(selected)}
                  className="px-4 py-2.5 rounded-xl text-[13px] font-medium disabled:opacity-50"
                  style={{ color: '#EF4444' }}>
                  Ablehnen
                </button>
              </>
            ) : (
              <>
                <Link href={'/firma/' + selected.id}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white"
                  style={{ background: 'var(--ink)' }}>
                  Dossier öffnen →
                </Link>
                <button className="px-4 py-2.5 rounded-xl text-[13px] font-medium"
                  style={{ border: '1px solid var(--line)', color: 'var(--ink)', background: 'var(--panel)' }}>
                  Bearbeiten
                </button>
                <button disabled={acting === selected.id + '-reject'} onClick={() => handleAblehnen(selected)}
                  className="px-4 py-2.5 rounded-xl text-[13px] font-medium disabled:opacity-50"
                  style={{ color: '#EF4444' }}>
                  Ablehnen
                </button>
              </>
            )}
            {(() => {
              const idx   = inboxDeals.findIndex(d => d.id === selected.id)
              const total = inboxDeals.length
              const prev  = idx > 0        ? inboxDeals[idx - 1] : null
              const next  = idx < total - 1 ? inboxDeals[idx + 1] : null
              return (
                <div className="ml-auto flex items-center gap-2 text-[11px]" style={{ color: 'var(--muted)' }}>
                  <span>{idx + 1} von {total}</span>
                  <button disabled={!prev} onClick={() => prev && setSelected(prev as DealWithContact)}
                    className="px-1.5 py-0.5 rounded disabled:opacity-30">↑</button>
                  <button disabled={!next} onClick={() => next && setSelected(next as DealWithContact)}
                    className="px-1.5 py-0.5 rounded disabled:opacity-30">↓</button>
                  {next && <button onClick={() => setSelected(next as DealWithContact)} className="font-medium hover:underline" style={{ color: 'var(--muted)' }}>nächste</button>}
                </div>
              )
            })()}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-[13px]" style={{ color: 'var(--muted)' }}>
          Kandidat wählen
        </div>
      )}

      {/* ── Send Modal ─────────────────────────────────────────────── */}
      {sendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={e => { if (e.target === e.currentTarget) setSendModal(null) }}>
          <div className="w-[560px] rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
              <div>
                <div className="text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>Brief versenden</div>
                <div className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>{sendModal.name}</div>
              </div>
              <div className="flex items-center gap-2">
                {['Kein Preis','Kein Score','Keine Schwächen'].map(l => (
                  <span key={l} className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#D1FAE5', color: '#065F46' }}>✓ {l}</span>
                ))}
                <button onClick={() => setSendModal(null)} className="ml-2 p-1 rounded-lg hover:bg-slate-100">
                  <X size={15} style={{ color: 'var(--muted)' }} />
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5">

              {/* Absender */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>
                  Absender
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] block mb-1" style={{ color: 'var(--muted)' }}>Name</label>
                    <input type="text" value={senderName} onChange={e => setSenderName(e.target.value)}
                      placeholder="M. Keller"
                      className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
                      style={{ border: '1.5px solid var(--line)', color: 'var(--ink)', background: 'var(--bg)' }} />
                  </div>
                  <div>
                    <label className="text-[10px] block mb-1" style={{ color: 'var(--muted)' }}>E-Mail *</label>
                    <input type="email" value={senderEmail} onChange={e => setSenderEmail(e.target.value)}
                      placeholder="m.keller@finalu.ch"
                      className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
                      style={{ border: `1.5px solid ${senderEmail ? 'var(--line)' : '#FCA5A5'}`, color: 'var(--ink)', background: 'var(--bg)' }} />
                  </div>
                </div>
              </div>

              {/* Empfänger */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Empfänger</div>
                  {emailResult && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: emailResult.confidence === 'hoch' ? '#D1FAE5' : emailResult.confidence === 'mittel' ? '#FEF3C7' : '#F3F4F6',
                               color: CONFIDENCE_COLOR[emailResult.confidence] }}>
                      {emailResult.source} · {CONFIDENCE_LABEL[emailResult.confidence]}
                    </span>
                  )}
                  {!emailResult && (
                    <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--muted)' }}>
                      <Info size={11} /> Nicht automatisch gefunden — bitte manuell eintragen
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] block mb-1" style={{ color: 'var(--muted)' }}>Ansprechperson</label>
                    <input type="text" value={recipientName} onChange={e => setRecipientName(e.target.value)}
                      placeholder="Herr Meier"
                      className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
                      style={{ border: '1.5px solid var(--line)', color: 'var(--ink)', background: 'var(--bg)' }} />
                  </div>
                  <div>
                    <label className="text-[10px] block mb-1" style={{ color: 'var(--muted)' }}>E-Mail *</label>
                    <input type="email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)}
                      placeholder="inhaber@firma.ch"
                      className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
                      style={{ border: `1.5px solid ${recipientEmail ? 'var(--l1-line)' : '#FCA5A5'}`, color: 'var(--ink)', background: 'var(--bg)' }}
                      autoFocus={!emailResult} />
                  </div>
                </div>
              </div>

              {/* Brief preview */}
              <div className="rounded-xl p-4" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
                <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>Briefvorschau</div>
                <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--ink)', fontFamily: 'Georgia, serif' }}>
                  {letterDraft(sendModal)}
                </p>
              </div>
            </div>

            {/* Modal actions */}
            <div className="flex items-center gap-3 px-6 pb-5">
              <button
                disabled={!recipientEmail || !senderEmail || sending}
                onClick={handleSendConfirm}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all disabled:opacity-50"
                style={{ background: 'var(--l1)' }}>
                {sending ? <><RefreshCw size={13} className="animate-spin" /> Wird gesendet…</> : <><Send size={13} /> Jetzt versenden</>}
              </button>
              <button onClick={() => setSendModal(null)} className="px-4 py-2.5 rounded-xl text-[13px]"
                style={{ border: '1px solid var(--line)', color: 'var(--muted)' }}>Abbrechen</button>
              <span className="ml-auto text-[10px]" style={{ color: 'var(--muted)' }}>
                Versand via Resend · Audit-Log
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3.5 rounded-2xl shadow-xl text-[13px] font-semibold text-white"
          style={{ background: toast.ok ? 'var(--l1)' : '#374151', minWidth: 280 }}>
          {toast.ok ? <><Send size={14} /> {toast.msg}</> : <><X size={14} /> {toast.msg}</>}
        </div>
      )}
    </div>
  )
}

export default function InboxPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center flex-1 text-[13px]" style={{ color: 'var(--muted)' }}>
        <RefreshCw size={13} className="animate-spin mr-2" />Lade…
      </div>
    }>
      <InboxInner />
    </Suspense>
  )
}
