'use client'
import { useState, useMemo, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  scoreColor, type Deal, type DealType, type DealStatus, confidenceLabel,
} from '@/lib/mock-data'
import { useDeals } from '@/lib/use-deals'
import {
  X, Star, ThumbsDown, FileText, MessageSquare, ChevronRight,
  TrendingUp, AlertTriangle, Database, Zap, ExternalLink,
  SlidersHorizontal, Loader2, Sparkles, ArrowUp, ArrowDown,
} from 'lucide-react'

// ── Constants ─────────────────────────────────────────────────────────────────

const CANTONS = [
  'ZH','BE','LU','ZG','AG','SG','BL','SO','BS','TG',
  'GR','SH','SZ','GL','UR','OW','NW','AR','AI','FR',
  'VD','VS','NE','GE','TI','JU',
]

const UMSATZ_OPTIONS = [
  { label: 'Alle',   min: null,        max: null        },
  { label: '< 1M',  min: null,        max: 1_000_000   },
  { label: '1–5M',  min: 1_000_000,   max: 5_000_000   },
  { label: '5–10M', min: 5_000_000,   max: 10_000_000  },
  { label: '> 10M', min: 10_000_000,  max: null        },
]

const MA_OPTIONS = [
  { label: 'Alle', min: null, max: null },
  { label: '1–9',  min: 1,   max: 9    },
  { label: '10–49',min: 10,  max: 49   },
  { label: '50+',  min: 50,  max: null },
]

const SCORE_THRESHOLDS = [
  { value: 0,  label: 'Alle' },
  { value: 25, label: '≥ 25' },
  { value: 40, label: '≥ 40' },
  { value: 60, label: '≥ 60' },
]

const STATUS_TABS = [
  { id: 'active',      label: 'Aktiv'     },
  { id: 'new',         label: 'Neu'       },
  { id: 'shortlisted', label: 'Shortlist' },
  { id: 'rejected',    label: 'Abgelehnt' },
  { id: 'all',         label: 'Alle'      },
]

// ── Mini-components ────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 44 }: { score: number; size?: number }) {
  const r      = (size - 8) / 2
  const circ   = 2 * Math.PI * r
  const pct    = Math.min(score / 100, 1)
  const col    = scoreColor(score)
  const gradId = `thermo-${size}`
  const fontSize = size >= 56 ? '18px' : size >= 48 ? '14px' : '11px'

  return (
    <div className="relative flex items-center justify-center flex-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', position: 'absolute', top: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#3D5CA6" />
            <stop offset="25%"  stopColor="#6C4A96" />
            <stop offset="55%"  stopColor="#C2416B" />
            <stop offset="78%"  stopColor="#E8663C" />
            <stop offset="100%" stopColor="#F6BE45" />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none"
          stroke="var(--line)"
          strokeWidth={3}
        />
        {/* Thermoskala-Gradient-Ring */}
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={size >= 48 ? 4 : 3}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          style={{
            transition: 'stroke-dashoffset 0.85s cubic-bezier(0.4,0,0.2,1)',
            filter: score >= 60 ? `drop-shadow(0 0 4px ${col}AA)` : 'none',
          }}
        />
      </svg>
      <span
        className="font-bold font-mono tabular-nums relative z-10"
        style={{ color: col, fontSize }}
      >
        {score}
      </span>
    </div>
  )
}

function TypePill({ type }: { type: DealType }) {
  const isOff = type === 'off-market'
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold whitespace-nowrap"
      style={{
        background: isOff ? 'color-mix(in srgb, var(--l1) 15%, transparent)' : 'color-mix(in srgb, var(--l2) 15%, transparent)',
        color:      isOff ? 'var(--l1)' : 'var(--l2)',
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ background: isOff ? 'var(--l1)' : 'var(--l2)' }} />
      {isOff ? 'Off-Market' : 'On-Market'}
    </span>
  )
}

function ConfidenceBadge({ c }: { c: Deal['confidence'] }) {
  const color = c === 'A' ? '#00B88A' : c === 'B' ? '#E8920A' : '#8B92B2'
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded"
      style={{ color, background: color + '22' }}
    >
      {c} · {confidenceLabel(c)}
    </span>
  )
}

function StatusBadge({ status }: { status: DealStatus }) {
  const map: Record<DealStatus, { label: string; color: string }> = {
    'new':            { label: 'Neu',          color: '#5C6EFF' },
    'reviewed':       { label: 'Geprüft',      color: '#8B5CF6' },
    'shortlisted':    { label: 'Shortlist',    color: '#00B88A' },
    'outreach-ready': { label: 'Outreach',     color: '#E8920A' },
    'contacted':      { label: 'Kontaktiert',  color: '#0EA5E9' },
    'replied':        { label: 'Geantwortet',  color: '#10B981' },
    'rejected':       { label: 'Abgelehnt',    color: '#8B92B2' },
  }
  const { label, color } = map[status] ?? { label: status, color: '#6B7498' }
  return (
    <span
      className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
      style={{ color, background: color + '22' }}
    >
      {label}
    </span>
  )
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium"
      style={{ background: 'var(--bg)', color: 'var(--ink)', border: '1px solid var(--line)' }}
    >
      {label}
      <button onClick={onRemove} className="opacity-50 hover:opacity-100 transition-opacity ml-0.5">
        <X size={10} />
      </button>
    </span>
  )
}

// ── Score bar ─────────────────────────────────────────────────────────────────

function ScoreBar({ label, value, weight }: { label: string; value: number; weight: number }) {
  const col = scoreColor(value)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const t = setTimeout(() => setMounted(true), 50); return () => clearTimeout(t) }, [])
  const glow = value >= 60 ? `0 0 6px ${col}60` : 'none'

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px]" style={{ color: 'var(--muted)' }}>
          {label}
          <span className="ml-1 opacity-40">{weight}%</span>
        </span>
        <span className="text-[11px] font-bold font-mono tabular-nums" style={{ color: col }}>
          {value}
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--line)' }}>
        <div
          className="h-full rounded-full"
          style={{
            width: mounted ? `${value}%` : '0%',
            background: col,
            boxShadow: glow,
            transition: 'width 0.7s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      </div>
    </div>
  )
}

// ── Detail Panel ──────────────────────────────────────────────────────────────

function DetailPanel({
  deal,
  onClose,
  onAction,
}: {
  deal: Deal
  onClose: () => void
  onAction: (action: string, deal: Deal) => void
}) {
  const fmtChf = (n?: number) =>
    n ? `CHF ${(n / 1_000_000).toFixed(1)}M` : '–'

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-start gap-3 px-5 py-4 flex-none"
        style={{ borderBottom: '1px solid var(--line)' }}
      >
        <ScoreRing score={deal.score} size={60} />
        <div className="flex-1 min-w-0">
          <h2 className="text-[15px] font-semibold leading-tight" style={{ color: 'var(--ink)' }}>
            {deal.name}
          </h2>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <TypePill type={deal.type} />
            <ConfidenceBadge c={deal.confidence} />
            <StatusBadge status={deal.status} />
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg)] flex-none"
          style={{ color: 'var(--muted)' }}
        >
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-5 py-4 grid grid-cols-2 gap-x-4 gap-y-2.5"
          style={{ borderBottom: '1px solid var(--line)' }}>
          {[
            { label: 'Kanton',    value: deal.canton },
            { label: 'Branche',   value: deal.industry },
            { label: 'Gegründet', value: deal.founded ?? '–' },
            { label: 'MA',        value: deal.employees ?? '–' },
            { label: 'Umsatz',    value: fmtChf(deal.revenueChf) },
            { label: 'EBITDA',    value: fmtChf(deal.ebitdaChf) },
          ].map(r => (
            <div key={r.label}>
              <p className="text-[10px] uppercase tracking-wider font-semibold"
                style={{ color: 'var(--muted)' }}>{r.label}</p>
              <p className="text-[12px] font-medium mt-0.5" style={{ color: 'var(--ink)' }}>
                {String(r.value)}
              </p>
            </div>
          ))}
        </div>

        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
          <p className="text-[10px] uppercase tracking-wider font-semibold mb-1.5"
            style={{ color: 'var(--muted)' }}>Warum jetzt</p>
          <p className="text-[12px] leading-relaxed font-medium" style={{ color: deal.type === 'on-market' ? 'var(--l2)' : 'var(--l1)' }}>
            {deal.dealReason}
          </p>
        </div>

        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
          <p className="text-[10px] uppercase tracking-wider font-semibold mb-1.5"
            style={{ color: 'var(--muted)' }}>Executive Summary</p>
          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--ink)' }}>
            {deal.summary}
          </p>
        </div>

        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
          <p className="text-[10px] uppercase tracking-wider font-semibold mb-1.5"
            style={{ color: 'var(--muted)' }}>Deal-Hypothese</p>
          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--ink)' }}>
            {deal.dealHypothesis}
          </p>
        </div>

        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
          <p className="text-[10px] uppercase tracking-wider font-semibold mb-3"
            style={{ color: 'var(--muted)' }}>Score Breakdown</p>
          <div className="space-y-2.5">
            <ScoreBar label="Strategic Fit"           value={deal.scoreBreakdown.strategicFit}      weight={30} />
            <ScoreBar label="Unternehmensqualität"    value={deal.scoreBreakdown.companyQuality}    weight={25} />
            <ScoreBar label="Verkaufswahrscheinlichkeit" value={deal.scoreBreakdown.salesProbability} weight={20} />
            <ScoreBar label="Outreach-Potenzial"      value={deal.scoreBreakdown.outreachPotential} weight={15} />
            <ScoreBar label="Datenqualität"           value={deal.scoreBreakdown.dataQuality}       weight={10} />
          </div>
        </div>

        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp size={11} style={{ color: 'var(--go)' }} />
                <p className="text-[10px] uppercase tracking-wider font-semibold"
                  style={{ color: 'var(--muted)' }}>Signale</p>
              </div>
              <ul className="space-y-1.5">
                {deal.signals.map((s, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[11px]" style={{ color: 'var(--ink)' }}>
                    <span className="w-1 h-1 rounded-full mt-1.5 flex-none" style={{ background: 'var(--go)' }} />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle size={11} style={{ color: '#ef4444' }} />
                <p className="text-[10px] uppercase tracking-wider font-semibold"
                  style={{ color: 'var(--muted)' }}>Red Flags</p>
              </div>
              <ul className="space-y-1.5">
                {deal.redFlags.map((f, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[11px]" style={{ color: 'var(--ink)' }}>
                    <span className="w-1 h-1 rounded-full mt-1.5 flex-none" style={{ background: '#ef4444' }} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {deal.outreachAngle && deal.outreachAngle !== '—' && (
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <MessageSquare size={11} style={{ color: 'var(--l2)' }} />
              <p className="text-[10px] uppercase tracking-wider font-semibold"
                style={{ color: 'var(--muted)' }}>Outreach-Ansatz</p>
            </div>
            <p className="text-[12px] leading-relaxed" style={{ color: 'var(--ink)' }}>
              {deal.outreachAngle}
            </p>
          </div>
        )}

        <div className="px-5 py-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Database size={11} style={{ color: 'var(--muted)' }} />
            <p className="text-[10px] uppercase tracking-wider font-semibold"
              style={{ color: 'var(--muted)' }}>Datenquellen</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {deal.sources.map((s, i) => {
              const isListingSource = deal.listingUrl && deal.listingPlatform && s === deal.listingPlatform
              return isListingSource ? (
                <a
                  key={i}
                  href={deal.listingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-semibold transition-opacity hover:opacity-75"
                  style={{ background: 'color-mix(in srgb, var(--l2) 15%, transparent)', color: 'var(--l2)', border: '1px solid color-mix(in srgb, var(--l2) 40%, transparent)' }}
                >
                  {s}
                  <ExternalLink size={9} />
                </a>
              ) : (
                <span key={i} className="text-[10px] px-2 py-0.5 rounded"
                  style={{ background: 'var(--bg)', color: 'var(--muted)', border: '1px solid var(--line)' }}>
                  {s}
                </span>
              )
            })}
          </div>
        </div>
      </div>

      <div
        className="flex-none px-5 py-4 grid grid-cols-2 gap-2"
        style={{ borderTop: '1px solid var(--line)', background: 'var(--panel)' }}
      >
        <button
          onClick={() => onAction('shortlist', deal)}
          className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-semibold transition-all active:scale-95"
          style={{ background: 'var(--ink)', color: 'var(--bg)' }}
        >
          <Star size={12} fill="currentColor" /> Shortlist
        </button>
        <button
          onClick={() => onAction('reject', deal)}
          className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-medium transition-all active:scale-95"
          style={{ background: 'var(--bg)', color: 'var(--muted)', border: '1px solid var(--line)' }}
        >
          <ThumbsDown size={12} /> Ablehnen
        </button>
        <button
          onClick={() => onAction('dossier', deal)}
          className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-medium transition-all active:scale-95 col-span-2"
          style={{ background: 'color-mix(in srgb, var(--l2) 12%, transparent)', color: 'var(--l2)', border: '1px solid color-mix(in srgb, var(--l2) 30%, transparent)' }}
        >
          <FileText size={12} /> Dossier öffnen
        </button>
      </div>
    </div>
  )
}

// ── Main Inbox ────────────────────────────────────────────────────────────────

function InboxContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const initialDealId = searchParams.get('deal')
  const initialType   = searchParams.get('type') as DealType | null

  const { deals: liveDeals, loading, source } = useDeals()
  const [deals, setDeals] = useState<Deal[]>([])
  useEffect(() => { if (liveDeals.length) setDeals(liveDeals) }, [liveDeals])

  const [selected, setSelected] = useState<Deal | null>(null)
  useEffect(() => {
    if (initialDealId && deals.length)
      setSelected(deals.find(d => d.id === initialDealId) ?? null)
  }, [initialDealId, deals])

  // ── Filter state ─────────────────────────────────────────────────────────────
  const [query,        setQuery]        = useState('')
  const [aiLoading,    setAiLoading]    = useState(false)
  const [aiNote,       setAiNote]       = useState('')
  const [showFilters,  setShowFilters]  = useState(false)
  const [sortDir,      setSortDir]      = useState<'desc' | 'asc'>('desc')

  const [typeFilter,    setTypeFilter]    = useState<'all' | DealType>(initialType ?? 'all')
  const [statusFilter,  setStatusFilter]  = useState<'all' | DealStatus | 'active'>('active')
  const [minScore,      setMinScore]      = useState<number>(0)
  const [filterCanton,  setFilterCanton]  = useState<string | null>(null)
  const [filterBranche, setFilterBranche] = useState<string | null>(null)
  const [filterUMin,    setFilterUMin]    = useState<number | null>(null)
  const [filterUMax,    setFilterUMax]    = useState<number | null>(null)
  const [filterMAMin,   setFilterMAMin]   = useState<number | null>(null)
  const [filterMAMax,   setFilterMAMax]   = useState<number | null>(null)

  // Server-side re-fetch when canton or branche changes (they need full DB scope)
  const [serverLoading, setServerLoading] = useState(false)
  useEffect(() => {
    if (!filterCanton && !filterBranche) {
      if (liveDeals.length) setDeals(liveDeals)
      return
    }
    setServerLoading(true)
    const params = new URLSearchParams()
    if (filterCanton)  params.set('canton', filterCanton)
    if (filterBranche) params.set('branche', filterBranche)
    fetch(`/api/deals?${params}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setDeals(data) })
      .catch(() => {})
      .finally(() => setServerLoading(false))
  }, [filterCanton, filterBranche, liveDeals])

  // ── Computed filtered list ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let r = deals
    if (typeFilter !== 'all') r = r.filter(d => d.type === typeFilter)
    if (statusFilter === 'active') r = r.filter(d => d.status !== 'rejected')
    else if (statusFilter !== 'all') r = r.filter(d => d.status === statusFilter)
    if (minScore > 0) r = r.filter(d => d.score >= minScore)
    if (filterCanton)  r = r.filter(d => d.canton === filterCanton)
    if (filterBranche) r = r.filter(d =>
      d.industry?.toLowerCase().includes(filterBranche.toLowerCase()) ||
      d.name.toLowerCase().includes(filterBranche.toLowerCase())
    )
    if (filterUMin  != null) r = r.filter(d => d.revenueChf != null && d.revenueChf >= filterUMin!)
    if (filterUMax  != null) r = r.filter(d => d.revenueChf != null && d.revenueChf <= filterUMax!)
    if (filterMAMin != null) r = r.filter(d => d.employees  != null && d.employees  >= filterMAMin!)
    if (filterMAMax != null) r = r.filter(d => d.employees  != null && d.employees  <= filterMAMax!)
    if (query.trim()) {
      const q = query.toLowerCase()
      r = r.filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.canton.toLowerCase().includes(q) ||
        d.industry.toLowerCase().includes(q) ||
        d.dealReason.toLowerCase().includes(q) ||
        (d.summary ?? '').toLowerCase().includes(q)
      )
    }
    return r.sort((a, b) => sortDir === 'desc' ? b.score - a.score : a.score - b.score)
  }, [deals, typeFilter, statusFilter, minScore, filterCanton, filterBranche, filterUMin, filterUMax, filterMAMin, filterMAMax, query, sortDir])

  // Type tab counts (excluding typeFilter itself so tabs show full picture)
  const baseCounts = useMemo(() => {
    let r = deals
    if (statusFilter === 'active') r = r.filter(d => d.status !== 'rejected')
    else if (statusFilter !== 'all') r = r.filter(d => d.status === statusFilter)
    if (minScore > 0) r = r.filter(d => d.score >= minScore)
    if (filterCanton)  r = r.filter(d => d.canton === filterCanton)
    if (filterBranche) r = r.filter(d => d.industry?.toLowerCase().includes(filterBranche.toLowerCase()) || d.name.toLowerCase().includes(filterBranche.toLowerCase()))
    if (filterUMin  != null) r = r.filter(d => d.revenueChf != null && d.revenueChf >= filterUMin!)
    if (filterUMax  != null) r = r.filter(d => d.revenueChf != null && d.revenueChf <= filterUMax!)
    if (filterMAMin != null) r = r.filter(d => d.employees  != null && d.employees  >= filterMAMin!)
    if (filterMAMax != null) r = r.filter(d => d.employees  != null && d.employees  <= filterMAMax!)
    if (query.trim()) {
      const q = query.toLowerCase()
      r = r.filter(d => d.name.toLowerCase().includes(q) || d.canton.toLowerCase().includes(q) || d.industry.toLowerCase().includes(q) || d.dealReason.toLowerCase().includes(q))
    }
    return { all: r.length, off: r.filter(d => d.type === 'off-market').length, on: r.filter(d => d.type === 'on-market').length }
  }, [deals, statusFilter, minScore, filterCanton, filterBranche, filterUMin, filterUMax, filterMAMin, filterMAMax, query])

  // ── AI Search ─────────────────────────────────────────────────────────────────
  async function runAiSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim() || aiLoading) return
    setAiLoading(true)
    try {
      const res = await fetch('/api/search/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })
      const data = await res.json()
      if (data.canton)            setFilterCanton(data.canton)
      if (data.branche)           setFilterBranche(data.branche)
      if (data.type)              setTypeFilter(data.type)
      if (data.umsatz_min  != null) setFilterUMin(data.umsatz_min)
      if (data.umsatz_max  != null) setFilterUMax(data.umsatz_max)
      if (data.mitarbeiter_min != null) setFilterMAMin(data.mitarbeiter_min)
      if (data.mitarbeiter_max != null) setFilterMAMax(data.mitarbeiter_max)
      if (data.score_min   != null && data.score_min > 0) setMinScore(data.score_min)
      setAiNote(data.interpretation ?? '')
    } catch {
      // silent fallback — text search still works
    } finally {
      setAiLoading(false)
    }
  }

  function clearAllFilters() {
    setQuery(''); setAiNote(''); setFilterCanton(null); setFilterBranche(null)
    setFilterUMin(null); setFilterUMax(null); setFilterMAMin(null); setFilterMAMax(null)
    setMinScore(0); setTypeFilter('all'); setStatusFilter('active')
  }

  const hasStructuredFilters = !!(filterCanton || filterBranche || filterUMin || filterUMax || filterMAMin || filterMAMax)

  // ── Actions ───────────────────────────────────────────────────────────────────
  function handleAction(action: string, deal: Deal) {
    if (action === 'shortlist') {
      setDeals(prev => prev.map(d => d.id === deal.id ? { ...d, status: 'shortlisted', pipelineStage: 'shortlisted' } : d))
      setSelected(prev => prev?.id === deal.id ? { ...prev, status: 'shortlisted' } : prev)
    }
    if (action === 'reject') {
      setDeals(prev => prev.map(d => d.id === deal.id ? { ...d, status: 'rejected', pipelineStage: 'rejected' } : d))
      setSelected(null)
    }
    if (action === 'dossier') {
      router.push(`/firma/${deal.id}`)
    }
  }

  const panelWidth = 440

  if (loading) return (
    <div className="flex items-center justify-center h-64" style={{ color: 'var(--muted)' }}>
      <Loader2 size={18} className="animate-spin mr-2" />
      <span className="text-[13px]">Lade Deals…</span>
    </div>
  )

  return (
    <div className="flex h-[calc(100vh-50px)] overflow-hidden relative">

      {/* Demo banner */}
      {source === 'mock' && (
        <div className="absolute top-0 left-0 right-0 z-50 px-4 py-1.5 text-center text-[11px] font-medium"
          style={{ background: '#fef3c7', color: '#92400e' }}>
          Demo-Daten — Pipeline muss zuerst laufen um echte Deals zu laden
        </div>
      )}

      {/* Main list */}
      <div
        className="flex flex-col flex-1 min-w-0 overflow-hidden transition-all duration-300"
        style={{ marginRight: selected ? panelWidth : 0 }}
      >
        {/* ── Toolbar ── */}
        <div
          className="flex-none"
          style={{ borderBottom: '1px solid var(--line)', background: 'var(--panel)' }}
        >
          {/* Row 1: AI Search */}
          <form onSubmit={runAiSearch} className="px-4 pt-3 pb-2 flex items-center gap-2">
            <div className="relative flex-1">
              <Sparkles
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: aiLoading ? 'var(--l2)' : 'var(--muted)' }}
              />
              <input
                type="text"
                placeholder="KI-Suche: z.B. «Handwerksbetrieb Zürich, Inhaber 60+» — Enter für KI · tippt live für Textsuche"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl text-[12px] outline-none"
                style={{
                  background: 'var(--bg)',
                  border: `1px solid ${aiLoading ? 'var(--l2)' : 'var(--line)'}`,
                  color: 'var(--ink)',
                  transition: 'border-color 0.2s',
                }}
              />
            </div>
            <button
              type="submit"
              disabled={aiLoading || !query.trim()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all active:scale-95 disabled:opacity-40"
              style={{ background: 'var(--l2)', color: '#fff' }}
            >
              {aiLoading
                ? <><Loader2 size={12} className="animate-spin" /> Analysiert…</>
                : <><Sparkles size={12} /> KI-Suche</>
              }
            </button>
            {(query || hasStructuredFilters) && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="px-2.5 py-2 rounded-xl text-[11px] transition-colors"
                style={{ color: 'var(--muted)', border: '1px solid var(--line)' }}
              >
                Löschen
              </button>
            )}
          </form>

          {/* AI interpretation + active filter chips */}
          {(aiNote || hasStructuredFilters) && (
            <div className="px-4 pb-2 flex items-center gap-2 flex-wrap">
              {aiNote && (
                <span className="text-[11px] italic" style={{ color: 'var(--muted)' }}>
                  KI: {aiNote}
                </span>
              )}
              {filterCanton && (
                <FilterChip label={`Kanton: ${filterCanton}`} onRemove={() => setFilterCanton(null)} />
              )}
              {filterBranche && (
                <FilterChip label={`Branche: ${filterBranche}`} onRemove={() => setFilterBranche(null)} />
              )}
              {(filterUMin != null || filterUMax != null) && (
                <FilterChip
                  label={`Umsatz: ${filterUMin ? `CHF ${(filterUMin/1e6).toFixed(0)}M` : '0'}–${filterUMax ? `CHF ${(filterUMax/1e6).toFixed(0)}M` : '∞'}`}
                  onRemove={() => { setFilterUMin(null); setFilterUMax(null) }}
                />
              )}
              {(filterMAMin != null || filterMAMax != null) && (
                <FilterChip
                  label={`MA: ${filterMAMin ?? 1}–${filterMAMax ?? '∞'}`}
                  onRemove={() => { setFilterMAMin(null); setFilterMAMax(null) }}
                />
              )}
            </div>
          )}

          {/* Row 2: Type tabs + controls */}
          <div className="px-4 pb-2 flex items-center gap-1">
            {/* Type tabs */}
            {([
              { id: 'all',        label: `Alle (${baseCounts.all})` },
              { id: 'off-market', label: `Off-Market (${baseCounts.off})` },
              { id: 'on-market',  label: `On-Market (${baseCounts.on})` },
            ] as const).map(t => (
              <button
                key={t.id}
                onClick={() => setTypeFilter(t.id)}
                className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
                style={{
                  background: typeFilter === t.id ? 'var(--bg)' : 'transparent',
                  color:      typeFilter === t.id ? 'var(--ink)' : 'var(--muted)',
                  fontWeight: typeFilter === t.id ? 600 : 400,
                }}
              >
                {t.label}
              </button>
            ))}

            <div className="ml-auto flex items-center gap-2">
              {/* Score threshold */}
              <div className="flex items-center gap-0.5 rounded-lg p-0.5"
                style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
                {SCORE_THRESHOLDS.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setMinScore(t.value)}
                    className="px-2 py-1 rounded-md text-[11px] font-medium transition-colors"
                    style={{
                      background: minScore === t.value ? 'var(--panel)' : 'transparent',
                      color:      minScore === t.value ? scoreColor(Math.max(t.value, 50)) : 'var(--muted)',
                      fontWeight: minScore === t.value ? 600 : 400,
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Status */}
              <div className="flex items-center gap-0.5 rounded-lg p-0.5"
                style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
                {STATUS_TABS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setStatusFilter(t.id as any)}
                    className="px-2 py-1 rounded-md text-[11px] font-medium transition-colors"
                    style={{
                      background: statusFilter === t.id ? 'var(--panel)' : 'transparent',
                      color:      statusFilter === t.id ? 'var(--ink)' : 'var(--muted)',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Filter toggle */}
              <button
                onClick={() => setShowFilters(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
                style={{
                  background: showFilters || hasStructuredFilters ? 'var(--bg)' : 'transparent',
                  color:      hasStructuredFilters ? 'var(--ink)' : 'var(--muted)',
                  border:     hasStructuredFilters ? '1px solid var(--line)' : '1px solid transparent',
                }}
              >
                <SlidersHorizontal size={12} />
                Filter
                {hasStructuredFilters && (
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--l2)' }} />
                )}
              </button>
            </div>
          </div>

          {/* Row 3: Expandable structured filter panel */}
          {showFilters && (
            <div
              className="px-4 pb-3 pt-2.5 grid grid-cols-4 gap-5"
              style={{ borderTop: '1px solid var(--line)' }}
            >
              {/* Kanton */}
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold mb-2"
                  style={{ color: 'var(--muted)' }}>Kanton</p>
                <div className="flex flex-wrap gap-1">
                  {CANTONS.map(c => (
                    <button
                      key={c}
                      onClick={() => setFilterCanton(filterCanton === c ? null : c)}
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors"
                      style={{
                        background: filterCanton === c ? 'var(--l2)' : 'var(--bg)',
                        color:      filterCanton === c ? '#fff' : 'var(--muted)',
                        border:     '1px solid var(--line)',
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Branche */}
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold mb-2"
                  style={{ color: 'var(--muted)' }}>Branche</p>
                <input
                  type="text"
                  placeholder="z.B. IT, Gastronomie, Bau…"
                  value={filterBranche ?? ''}
                  onChange={e => setFilterBranche(e.target.value || null)}
                  className="w-full px-3 py-1.5 rounded-lg text-[12px] outline-none"
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--line)',
                    color: 'var(--ink)',
                  }}
                />
                {/* Common branche chips */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {['IT', 'Gastronomie', 'Handwerk', 'Gesundheit', 'Bau', 'Handel'].map(b => (
                    <button
                      key={b}
                      onClick={() => setFilterBranche(filterBranche === b ? null : b)}
                      className="px-2 py-0.5 rounded text-[10px] transition-colors"
                      style={{
                        background: filterBranche === b ? 'var(--l2)' : 'var(--bg)',
                        color:      filterBranche === b ? '#fff' : 'var(--muted)',
                        border:     '1px solid var(--line)',
                      }}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              {/* Umsatz */}
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold mb-2"
                  style={{ color: 'var(--muted)' }}>Umsatz</p>
                <div className="flex flex-col gap-1">
                  {UMSATZ_OPTIONS.map(o => {
                    const active = filterUMin === o.min && filterUMax === o.max
                    return (
                      <button
                        key={o.label}
                        onClick={() => { setFilterUMin(active ? null : o.min); setFilterUMax(active ? null : o.max) }}
                        className="px-3 py-1 rounded-lg text-left text-[11px] font-medium transition-colors"
                        style={{
                          background: active ? 'var(--l2)' : 'var(--bg)',
                          color:      active ? '#fff' : 'var(--muted)',
                          border:     '1px solid var(--line)',
                        }}
                      >
                        {o.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Mitarbeiter */}
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold mb-2"
                  style={{ color: 'var(--muted)' }}>Mitarbeiter</p>
                <div className="flex flex-col gap-1">
                  {MA_OPTIONS.map(o => {
                    const active = filterMAMin === o.min && filterMAMax === o.max
                    return (
                      <button
                        key={o.label}
                        onClick={() => { setFilterMAMin(active ? null : o.min); setFilterMAMax(active ? null : o.max) }}
                        className="px-3 py-1 rounded-lg text-left text-[11px] font-medium transition-colors"
                        style={{
                          background: active ? 'var(--l2)' : 'var(--bg)',
                          color:      active ? '#fff' : 'var(--muted)',
                          border:     '1px solid var(--line)',
                        }}
                      >
                        {o.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Deal Table ── */}
        <div className="flex-1 overflow-y-auto">
          {/* Column header */}
          <div
            className="grid px-5 py-2 text-[10px] uppercase tracking-widest font-semibold sticky top-0 z-10"
            style={{
              gridTemplateColumns: '56px 1fr 72px 150px 110px 80px',
              color: 'var(--muted)',
              background: 'var(--panel)',
              borderBottom: '1px solid var(--line)',
              boxShadow: 'inset 3px 0 0 transparent',
            }}
          >
            {/* Clickable Score header — toggles sort direction */}
            <button
              onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
              className="flex items-center gap-1 hover:opacity-100 transition-opacity text-left"
              style={{ color: 'var(--ink)', fontWeight: 700 }}
              title={sortDir === 'desc' ? 'Höchste zuerst — klicken für niedrigste zuerst' : 'Niedrigste zuerst — klicken für höchste zuerst'}
            >
              Score
              {sortDir === 'desc'
                ? <ArrowDown size={10} />
                : <ArrowUp size={10} />
              }
            </button>
            <span>
              Firma & Grund
              {serverLoading
                ? <span className="normal-case tracking-normal font-normal ml-2 opacity-60">lädt…</span>
                : <span className="normal-case tracking-normal font-normal ml-2 opacity-60">
                    — {filtered.length} Deals
                    {deals.length > filtered.length && ` von ${deals.length} total`}
                  </span>
              }
            </span>
            <span>Kanton</span>
            <span>Branche</span>
            <span>Status</span>
            <span />
          </div>

          {filtered.length === 0 ? (
            <div className="py-20 text-center space-y-2" style={{ color: 'var(--muted)' }}>
              <Zap size={24} className="mx-auto mb-3 opacity-30" />
              <p className="text-[13px]">Keine qualifizierten Deals gefunden.</p>
              {filterCanton && (
                <p className="text-[11px] max-w-xs mx-auto leading-relaxed opacity-70">
                  Firmen aus {filterCanton} sind in der Datenbank, aber noch nicht bewertet.
                  Das Enrichment verarbeitet täglich 500 Firmen — die Region wird bald verfügbar sein.
                </p>
              )}
              <button
                onClick={clearAllFilters}
                className="mt-3 text-[11px] underline opacity-60 hover:opacity-100"
              >
                Filter zurücksetzen
              </button>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--line)' }}>
              {filtered.map((deal, i) => (
                <motion.button
                  key={deal.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.22, delay: Math.min(i * 0.016, 0.28), ease: 'easeOut' }}
                  whileHover={{ x: 2 }}
                  onClick={() => setSelected(s => s?.id === deal.id ? null : deal)}
                  className="w-full text-left grid items-center px-5 py-3"
                  style={{
                    gridTemplateColumns: '56px 1fr 72px 150px 110px 80px',
                    background: selected?.id === deal.id ? 'var(--bg)' : 'transparent',
                    boxShadow: `inset 3px 0 0 ${deal.type === 'on-market' ? 'var(--l2)' : 'var(--l1)'}`,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (selected?.id !== deal.id) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg)' }}
                  onMouseLeave={e => { if (selected?.id !== deal.id) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                >
                  <ScoreRing score={deal.score} size={40} />

                  <div className="min-w-0 pr-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[13px] font-semibold truncate" style={{ color: 'var(--ink)' }}>
                        {deal.name}
                      </span>
                      <TypePill type={deal.type} />
                    </div>
                    <p className="text-[11px] mt-0.5 truncate flex items-center gap-1.5" style={{ color: 'var(--muted)' }}>
                      {deal.type === 'on-market' ? (
                        <>
                          <span
                            className="text-[9px] font-mono font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded flex-none"
                            style={{ background: 'color-mix(in srgb, var(--l2) 15%, transparent)', color: 'var(--l2)' }}
                          >
                            {deal.listingPlatform ?? 'Plattform'}
                          </span>
                          <span className="truncate">Inhaber sucht Nachfolger / Käufer</span>
                        </>
                      ) : (
                        <span className="truncate">{deal.dealReason}</span>
                      )}
                    </p>
                  </div>

                  <span className="text-[12px] font-mono" style={{ color: 'var(--muted)' }}>
                    {deal.canton}
                  </span>

                  <span className="text-[11px] truncate pr-2" style={{ color: 'var(--muted)' }}>
                    {deal.industry}
                  </span>

                  <StatusBadge status={deal.status} />

                  {deal.type === 'on-market' && deal.listingUrl ? (
                    <span
                      role="button"
                      tabIndex={0}
                      title={`Inserat auf ${deal.listingPlatform ?? 'Plattform'} öffnen`}
                      onClick={e => {
                        e.stopPropagation()
                        window.open(deal.listingUrl, '_blank', 'noopener,noreferrer')
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.stopPropagation()
                          window.open(deal.listingUrl!, '_blank', 'noopener,noreferrer')
                        }
                      }}
                      className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors cursor-pointer"
                      style={{ color: 'var(--l2)', background: 'color-mix(in srgb, var(--l2) 10%, transparent)' }}
                    >
                      <ExternalLink size={13} />
                    </span>
                  ) : (
                    <ChevronRight
                      size={14}
                      style={{
                        color: 'var(--muted)',
                        transform: selected?.id === deal.id ? 'rotate(90deg)' : 'none',
                        transition: 'transform 0.2s',
                      }}
                    />
                  )}
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Right detail panel ── */}
      <AnimatePresence>
        {selected && (
          <motion.div
            key={selected.id}
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            className="fixed right-0 top-[50px] bottom-0 overflow-hidden flex flex-col"
            style={{
              width: panelWidth,
              background: 'var(--panel)',
              borderLeft: '1px solid var(--line)',
              zIndex: 40,
            }}
          >
            <DetailPanel
              deal={selected}
              onClose={() => setSelected(null)}
              onAction={handleAction}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function InboxPage() {
  return (
    <Suspense>
      <InboxContent />
    </Suspense>
  )
}
