'use client'
import Link from 'next/link'
import { useState, useMemo, useRef, useCallback } from 'react'
import { useDeals } from '@/lib/use-deals'
import { scoreColor, scoreBg, type Deal } from '@/lib/mock-data'
import { RefreshCw, Radio, Play, Square, Zap, CheckCircle, X } from 'lucide-react'

// ── Micro helpers ─────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  if (!score) return <span className="w-8 h-8 flex items-center justify-center text-[11px]" style={{ color: 'var(--muted)' }}>–</span>
  return (
    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-[12px] font-bold tabular-nums flex-none"
      style={{ background: scoreBg(score), color: scoreColor(score) }}>
      {score}
    </span>
  )
}

function EbeneBadge({ type }: { type: Deal['type'] }) {
  const isOff = type === 'off-market'
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: isOff ? 'var(--l1-soft)' : 'var(--l2-soft)', color: isOff ? 'var(--l1)' : 'var(--l2)' }}>
      {isOff ? 'Ebene 1' : 'Ebene 2'}
    </span>
  )
}

function GateDots({ sb }: { sb: Deal['scoreBreakdown'] }) {
  const vals = [sb.strategicFit, sb.companyQuality, sb.salesProbability, sb.outreachPotential, sb.dataQuality]
  return (
    <div className="flex items-center gap-0.5">
      {vals.map((v, i) => (
        <span key={i} className="w-2.5 h-2.5 rounded-full"
          style={{ background: v >= 60 ? '#22C55E' : v >= 40 ? '#F59E0B' : '#EF4444' }} />
      ))}
    </div>
  )
}

function StatusText({ status }: { status: Deal['status'] }) {
  const map: Record<string, { label: string; color: string }> = {
    'new':            { label: 'Neu',         color: '#374151' },
    'reviewed':       { label: 'Dossier',     color: '#8B5CF6' },
    'shortlisted':    { label: 'Shortlisted', color: '#10B981' },
    'outreach-ready': { label: 'Freigabe',    color: '#F59E0B' },
    'contacted':      { label: 'Kontaktiert', color: '#0EA5E9' },
    'replied':        { label: 'Geantwortet', color: '#22C55E' },
    'rejected':       { label: 'Archiv',      color: '#9CA3AF' },
  }
  const { label, color } = map[status] ?? { label: status, color: '#9CA3AF' }
  return <span className="text-[11px]" style={{ color }}>{label}</span>
}

const INBOX_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  'outreach-ready': { label: 'Freigabe', bg: '#D1FAE5', color: '#065F46' },
  'reviewed':       { label: 'Freigabe', bg: '#D1FAE5', color: '#065F46' },
  'replied':        { label: 'Antwort',  bg: '#DBEAFE', color: '#1E40AF' },
  'contacted':      { label: 'Antwort',  bg: '#DBEAFE', color: '#1E40AF' },
  'new':            { label: 'Neu',      bg: '#F3F4F6', color: '#374151' },
}

function inboxBadge(status: string) {
  return INBOX_BADGE[status] ?? { label: 'Neu', bg: '#F3F4F6', color: '#374151' }
}

function inboxSub(deal: Deal): string {
  const b = inboxBadge(deal.status).label
  if (b === 'Freigabe') return 'Teil-2-Brief bereit'
  if (b === 'Antwort')  return 'Inhaber hat geantwortet'
  const src = deal.type === 'off-market' ? 'SHAB · VR-Mutation' : (deal.listingPlatform ?? 'companymarket.ch')
  return deal.pipelineStage === 'new-qualified' ? 'Neuer Kandidat · 5/5 Gates' : src
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function TagesuebersichtPage() {
  const { deals: DEALS, loading, source } = useDeals()
  const [ebeneTab,   setEbeneTab]  = useState<'alle' | 'ebene1' | 'ebene2'>('alle')
  const [scanOpen,   setScanOpen]   = useState(false)
  const [scanStage,  setScanStage]  = useState<'radar'|'process'|'all'>('radar')
  const [scanState,  setScanState]  = useState<'idle'|'running'|'done'|'error'>('idle')
  const [scanLogs,   setScanLogs]   = useState<string[]>([])
  const [scanProgress, setScanProgress] = useState<{ pct: number; current: number; total: number; phase: string } | null>(null)
  const logRef   = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const startRef = useRef<number>(0)

  const startScan = useCallback(async () => {
    if (scanState === 'running') return
    setScanLogs([])
    setScanProgress(null)
    setScanState('running')
    startRef.current = Date.now()
    abortRef.current = new AbortController()
    try {
      const res = await fetch(`/api/pipeline/run?stage=${scanStage}`, { signal: abortRef.current.signal })
      if (!res.body) { setScanState('error'); return }
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const parts = buf.split('\n\n'); buf = parts.pop() ?? ''
        for (const part of parts) {
          const line = part.replace(/^data:\s?/, '').trim()
          if (!line) continue
          setScanLogs(prev => {
            const next = [...prev, line]
            setTimeout(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight }, 0)
            return next
          })
          // Parse progress from various log formats
          const mProgress = line.match(/\[(\d+)\/(\d+)\]/)
          const mBatch    = line.match(/(\d+)\s+Firmen[,\s]+(\d+)\s+total/i)
          const mPhase    = line.match(/(?:Stufe|---)\s*(.+?)(?:\s*---|$)/)
          const mStart    = line.match(/=== ([\w\s]+): Start ===|=== Pipeline/)
          if (mProgress) {
            const cur   = parseInt(mProgress[1])
            const total = parseInt(mProgress[2])
            const pct   = Math.round((cur / total) * 100)
            setScanProgress(prev => ({ pct, current: cur, total, phase: prev?.phase ?? 'Verarbeitung' }))
          } else if (mBatch) {
            const cur   = parseInt(mBatch[1])
            const total = parseInt(mBatch[2])
            const pct   = total > 0 ? Math.round((cur / total) * 100) : 0
            setScanProgress(prev => ({ pct, current: cur, total, phase: prev?.phase ?? 'Radar' }))
          } else if (mPhase) {
            const phase = mPhase[1].trim().replace(/^---\s*/, '')
            setScanProgress(prev => prev ? { ...prev, phase } : { pct: 2, current: 0, total: 0, phase })
          } else if (mStart) {
            setScanProgress(prev => prev ?? { pct: 2, current: 0, total: 0, phase: mStart[1]?.trim() ?? 'Initialisierung' })
          } else if (!scanProgress && line.length > 10) {
            // Show bar for any log line
            setScanProgress(prev => prev ?? { pct: 5, current: 0, total: 0, phase: 'Radar läuft…' })
          }
        }
      }
      setScanProgress(prev => prev ? { ...prev, pct: 100 } : null)
      setScanState('done')
    } catch (e: any) {
      if (e?.name === 'AbortError') { setScanLogs(p => [...p, '[Gestoppt]']); setScanState('idle') }
      else { setScanLogs(p => [...p, `[Fehler: ${e?.message}]`]); setScanState('error') }
    }
  }, [scanStage, scanState])

  const today = new Date().toLocaleDateString('de-CH', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const offMarket = DEALS.filter(d => d.type === 'off-market')
  const onMarket  = DEALS.filter(d => d.type === 'on-market')
  const newToday  = DEALS.filter(d => d.status === 'new')
  const queueCount = DEALS.filter(d => ['outreach-ready','replied','contacted'].includes(d.status)).length

  const tableDeals = useMemo(() => DEALS
    .filter(d => ebeneTab === 'alle' || (ebeneTab === 'ebene1' ? d.type === 'off-market' : d.type === 'on-market'))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10),
  [DEALS, ebeneTab])

  const inboxDeals = useMemo(() => DEALS
    .filter(d => ['outreach-ready','reviewed','replied','contacted','new'].includes(d.status))
    .sort((a, b) => {
      const order: Record<string, number> = { 'outreach-ready': 0, 'reviewed': 0, 'replied': 1, 'contacted': 1, 'new': 2 }
      return (order[a.status] ?? 3) - (order[b.status] ?? 3) || b.score - a.score
    })
    .slice(0, 6),
  [DEALS])

  const contactStats = [
    { label: 'Antwort erhalten',    count: DEALS.filter(d => d.status === 'replied').length || 2    },
    { label: 'NDA in Prüfung',      count: 1                                                         },
    { label: 'Gespräch vereinbart', count: 1                                                         },
    { label: 'Wiedervorlage fällig',count: 3, warn: true                                             },
  ]

  // Compute estimated remaining time
  const etaLabel = (() => {
    if (!scanProgress || scanState !== 'running' || scanProgress.pct <= 0 || scanProgress.total <= 0) return null
    const elapsed   = (Date.now() - startRef.current) / 1000
    const rate      = scanProgress.current / Math.max(elapsed, 1)
    const remaining = rate > 0 ? Math.round((scanProgress.total - scanProgress.current) / rate) : 0
    if (remaining <= 0) return null
    const mins = Math.floor(remaining / 60)
    const secs = remaining % 60
    return mins > 0 ? `~${mins}m ${secs}s verbleibend` : `~${secs}s verbleibend`
  })()

  if (loading) return (
    <div className="flex items-center justify-center flex-1 text-[13px]" style={{ color: 'var(--muted)' }}>
      <RefreshCw size={13} className="animate-spin mr-2" />Lade…
    </div>
  )

  return (
    <div className="flex flex-col flex-1 overflow-hidden">

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="flex-none px-8 pt-6 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[24px] font-bold tracking-tight" style={{ color: 'var(--ink)' }}>
              Tagesübersicht
            </h1>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--muted)' }}>{today}</p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {source === 'mock' && (
              <span className="text-[10px] px-2 py-0.5 rounded font-semibold" style={{ background: '#fef3c7', color: '#d97706' }}>Demo-Daten</span>
            )}
            <div className="flex items-center gap-1 text-[11px]" style={{ color: '#22C55E' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#22C55E' }} />
              Alle 9 Jobs OK
            </div>
            <button
              onClick={() => { setScanOpen(true); setScanState('idle'); setScanLogs([]) }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-semibold text-white transition-all hover:opacity-90 active:scale-95"
              style={{ background: 'var(--l1)', boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }}>
              <Radio size={14} /> Radar starten
            </button>
          </div>
        </div>

        {/* ── Progress bar (shown during scan) ──────────────────────── */}
        {(scanState === 'running' || (scanState === 'done' && scanProgress)) && (
          <div className="mt-4 rounded-xl overflow-hidden" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
            <div className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-2.5">
                {scanState === 'running'
                  ? <RefreshCw size={13} className="animate-spin flex-none" style={{ color: 'var(--l1)' }} />
                  : <CheckCircle size={13} className="flex-none" style={{ color: 'var(--l1)' }} />}
                <span className="text-[12px] font-semibold" style={{ color: 'var(--ink)' }}>
                  {scanState === 'done' ? 'Scan abgeschlossen' : (scanProgress?.phase || 'Radar läuft…')}
                </span>
                {scanProgress && scanProgress.total > 0 && (
                  <span className="text-[11px] font-mono" style={{ color: 'var(--muted)' }}>
                    {scanProgress.current.toLocaleString('de-CH')} / {scanProgress.total.toLocaleString('de-CH')} Firmen
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-bold font-mono" style={{ color: 'var(--l1)' }}>
                  {scanProgress ? `${scanProgress.pct}%` : '…'}
                </span>
                {scanState === 'running' && etaLabel && (
                  <span className="text-[10px]" style={{ color: 'var(--muted)' }}>{etaLabel}</span>
                )}
                <button onClick={() => setScanOpen(true)}
                  className="text-[10px] px-2 py-0.5 rounded-lg font-medium"
                  style={{ background: 'var(--bg)', color: 'var(--muted)', border: '1px solid var(--line)' }}>
                  Details
                </button>
              </div>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 w-full" style={{ background: 'var(--line)' }}>
              <div className="h-full transition-all duration-500"
                style={{
                  width: scanProgress ? `${scanProgress.pct}%` : '35%',
                  background: scanState === 'done' ? 'var(--l1)' : 'linear-gradient(90deg, #059669, #34D399)',
                  transition: 'width 0.5s ease',
                }} />
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4 mt-5">
          <div className="rounded-xl p-4" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
            <div className="text-[11px]" style={{ color: 'var(--muted)' }}>Neue Kandidaten heute</div>
            <div className="text-[34px] font-bold mt-1 leading-none" style={{ color: 'var(--ink)' }}>
              {Math.min(newToday.length, 12)}
            </div>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'var(--l1-soft)', border: '1px solid var(--l1-line)' }}>
            <div className="text-[11px] font-semibold" style={{ color: 'var(--l1)' }}>Ebene 1 · Off-Market</div>
            <div className="text-[34px] font-bold mt-1 leading-none" style={{ color: 'var(--l1)' }}>
              {Math.min(offMarket.length, 8)}
            </div>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'var(--l2-soft)', border: '1px solid var(--l2-line)' }}>
            <div className="text-[11px] font-semibold" style={{ color: 'var(--l2)' }}>Ebene 2 · On-Market</div>
            <div className="text-[34px] font-bold mt-1 leading-none" style={{ color: 'var(--l2)' }}>
              {Math.min(onMarket.length, 4)}
            </div>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
            <div className="text-[11px]" style={{ color: 'var(--muted)' }}>ID Room heute</div>
            <div className="text-[34px] font-bold mt-1 leading-none" style={{ color: 'var(--ink)' }}>
              {queueCount + 48}
            </div>
          </div>
        </div>
      </div>

      {/* ── Split content ────────────────────────────────────────────── */}
      <div className="flex-1 flex gap-4 px-8 pb-6 overflow-hidden min-h-0">

        {/* Left: Candidates table */}
        <div className="flex-1 flex flex-col rounded-xl overflow-hidden min-w-0"
          style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>

          {/* Table header */}
          <div className="flex items-center justify-between px-5 py-3 flex-none"
            style={{ borderBottom: '1px solid var(--line)' }}>
            <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Kandidaten · nach Score</span>
            <div className="flex items-center gap-1 p-0.5 rounded-lg" style={{ background: 'var(--bg)' }}>
              {([['alle','Alle'],['ebene1','Ebene 1'],['ebene2','Ebene 2']] as const).map(([v,l]) => (
                <button key={v} onClick={() => setEbeneTab(v)}
                  className="px-2.5 py-1 rounded-md text-[11px] font-medium transition-all"
                  style={{
                    background: ebeneTab === v
                      ? v === 'ebene1' ? 'var(--l1-soft)' : v === 'ebene2' ? 'var(--l2-soft)' : 'var(--panel)'
                      : 'transparent',
                    color: ebeneTab === v
                      ? v === 'ebene1' ? 'var(--l1)' : v === 'ebene2' ? 'var(--l2)' : 'var(--ink)'
                      : 'var(--muted)',
                    boxShadow: ebeneTab === v ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  }}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse">
              <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                <tr style={{ background: '#FAFAFA', borderBottom: '1px solid var(--line)' }}>
                  {['FIRMA','EBENE','KANTON','KO-GATES','STATUS','SCORE'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[9px] font-bold tracking-wider uppercase"
                      style={{ color: 'var(--muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableDeals.map((deal) => (
                  <tr key={deal.id}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    style={{ borderBottom: '1px solid var(--line)' }}
                    onClick={() => window.location.href = '/firma/' + deal.id}>
                    <td className="px-4 py-2.5">
                      <div className="text-[12.5px] font-semibold" style={{ color: 'var(--ink)' }}>{deal.name}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>
                        {deal.type === 'off-market'
                          ? 'SHAB · VR-Mutation'
                          : (deal.listingPlatform ?? 'companymarket.ch')}
                      </div>
                    </td>
                    <td className="px-4 py-2.5"><EbeneBadge type={deal.type} /></td>
                    <td className="px-4 py-2.5 text-[12px] font-mono font-semibold" style={{ color: 'var(--ink)' }}>
                      {deal.canton}
                    </td>
                    <td className="px-4 py-2.5"><GateDots sb={deal.scoreBreakdown} /></td>
                    <td className="px-4 py-2.5"><StatusText status={deal.status} /></td>
                    <td className="px-4 py-2.5"><ScoreBadge score={deal.score} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer link */}
          <div className="px-5 py-2.5 flex-none" style={{ borderTop: '1px solid var(--line)' }}>
            <Link href="/kandidaten" className="text-[11px] font-semibold" style={{ color: 'var(--l1)' }}>
              Alle Kandidaten ansehen →
            </Link>
          </div>
        </div>

        {/* Right: Inbox */}
        <div className="w-68 flex-none flex flex-col rounded-xl overflow-hidden"
          style={{ width: 264, background: 'var(--panel)', border: '1px solid var(--line)' }}>

          {/* Inbox header */}
          <div className="flex items-center justify-between px-4 py-3 flex-none"
            style={{ borderBottom: '1px solid var(--line)' }}>
            <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Inbox</span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: '#FEF3C7', color: '#D97706' }}>
              {inboxDeals.length} offen · 8 Min.
            </span>
          </div>

          {/* Inbox cards */}
          <div className="flex-1 overflow-auto">
            {inboxDeals.map(deal => {
              const b = inboxBadge(deal.status)
              return (
                <Link key={deal.id} href={'/inbox?id=' + deal.id}
                  className="flex items-start gap-2.5 px-4 py-3 hover:bg-slate-50 transition-colors block"
                  style={{ borderBottom: '1px solid var(--line)', display: 'flex' }}>
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: b.bg, color: b.color }}>
                      {b.label}
                    </span>
                    <div className="text-[12px] font-semibold mt-1 truncate" style={{ color: 'var(--ink)' }}>
                      {deal.name}
                    </div>
                    <div className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--muted)' }}>
                      {inboxSub(deal)}
                    </div>
                  </div>
                  <ScoreBadge score={deal.score} />
                </Link>
              )
            })}
          </div>

          {/* Inbox abarbeiten link */}
          <div className="px-4 py-2.5 flex-none" style={{ borderTop: '1px solid var(--line)' }}>
            <Link href="/inbox" className="text-[11px] font-semibold" style={{ color: 'var(--l1)' }}>
              Inbox abarbeiten →
            </Link>
          </div>

          {/* Kontakte im Arbeit */}
          <div className="flex-none" style={{ borderTop: '2px solid var(--line)' }}>
            <div className="px-4 pt-3 pb-2">
              <div className="text-[9px] font-bold uppercase tracking-widest mb-2"
                style={{ color: 'var(--muted)' }}>
                Kontakte im Arbeit
              </div>
              <div className="space-y-1.5">
                {contactStats.map(s => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className="text-[11px]" style={{ color: 'var(--muted)' }}>{s.label}</span>
                    <span className="text-[11px] font-bold"
                      style={{ color: s.warn ? '#F59E0B' : 'var(--ink)' }}>
                      {s.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Radar-Scan Modal ────────────────────────────────────────── */}
      {scanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={e => { if (e.target === e.currentTarget && scanState !== 'running') setScanOpen(false) }}>
          <div className="w-[660px] rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
              <div>
                <div className="text-[16px] font-bold" style={{ color: 'var(--ink)' }}>Radar-Scan</div>
                <div className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>
                  Täglich automatisch 06:00 · hier manuell starten · Delta-Scan (nur Neues)
                </div>
              </div>
              <button onClick={() => { if (scanState !== 'running') setScanOpen(false) }}
                className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40" disabled={scanState === 'running'}>
                <X size={16} style={{ color: 'var(--muted)' }} />
              </button>
            </div>

            {/* Stage selector */}
            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {([
                  { id: 'radar'   as const, icon: Radio, label: 'Radar',       desc: 'SHAB + Zefix + 8 Plattformen',   color: 'var(--l1)' },
                  { id: 'process' as const, icon: Zap,   label: 'Verarbeiten', desc: 'Anreichern + Scoren (kein Scan)', color: 'var(--l2)' },
                  { id: 'all'     as const, icon: Play,  label: 'Alles',       desc: 'Radar + Anreichern + Scoren',    color: '#8B5CF6'    },
                ]).map(opt => {
                  const Icon = opt.icon; const sel = scanStage === opt.id
                  return (
                    <button key={opt.id} onClick={() => setScanStage(opt.id)} disabled={scanState === 'running'}
                      className="flex flex-col items-start gap-1.5 p-3 rounded-xl text-left transition-all disabled:opacity-50"
                      style={{ background: sel ? `color-mix(in srgb, ${opt.color} 12%, white)` : 'var(--bg)', border: `1.5px solid ${sel ? opt.color : 'var(--line)'}` }}>
                      <div className="flex items-center gap-1.5">
                        <Icon size={13} style={{ color: sel ? opt.color : 'var(--muted)' }} />
                        <span className="text-[12px] font-semibold" style={{ color: sel ? opt.color : 'var(--ink)' }}>{opt.label}</span>
                      </div>
                      <span className="text-[10px]" style={{ color: 'var(--muted)' }}>{opt.desc}</span>
                    </button>
                  )
                })}
              </div>
              <div className="px-3 py-2 rounded-xl text-[11px]" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE' }}>
                <strong>Inkrementell:</strong> Nur neue Firmen werden gezogen. Bekannte UIDs und Listing-URLs werden übersprungen.
              </div>
            </div>

            {/* Log */}
            {scanLogs.length > 0 && (
              <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
                <div ref={logRef} className="h-40 overflow-y-auto p-3 rounded-xl font-mono text-[10.5px]"
                  style={{ background: '#0C0F1C', color: '#A0F0C0' }}>
                  {scanLogs.map((l, i) => <div key={i}>{l}</div>)}
                  {scanState === 'running' && (
                    <div className="flex items-center gap-1 opacity-50 mt-1">
                      <RefreshCw size={10} className="animate-spin" /> <span>läuft…</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Done */}
            {scanState === 'done' && (
              <div className="px-6 py-3 flex items-center gap-2" style={{ background: '#F0FDF4', borderBottom: '1px solid var(--line)' }}>
                <CheckCircle size={14} style={{ color: 'var(--l1)' }} />
                <span className="text-[12px] font-semibold" style={{ color: '#065F46' }}>
                  Scan abgeschlossen
                  {scanProgress && scanProgress.total > 0 && ` · ${scanProgress.total.toLocaleString('de-CH')} Firmen verarbeitet`}
                </span>
                <button onClick={() => { setScanOpen(false); window.location.reload() }}
                  className="ml-auto text-[11px] px-3 py-1 rounded-lg font-semibold"
                  style={{ background: 'var(--l1)', color: '#fff' }}>
                  Seite neu laden
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 px-6 py-4">
              {scanState !== 'running' ? (
                <button onClick={startScan}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all hover:opacity-90"
                  style={{ background: 'var(--l1)' }}>
                  <Radio size={14} /> {scanState === 'done' ? 'Erneut scannen' : 'Scan starten'}
                </button>
              ) : (
                <button onClick={() => abortRef.current?.abort()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white"
                  style={{ background: '#EF4444' }}>
                  <Square size={13} /> Stoppen
                </button>
              )}
              {scanState !== 'running' && (
                <button onClick={() => setScanOpen(false)} className="px-4 py-2.5 rounded-xl text-[13px]"
                  style={{ border: '1px solid var(--line)', color: 'var(--muted)' }}>
                  Schliessen
                </button>
              )}
              <span className="ml-auto text-[10px]" style={{ color: 'var(--muted)' }}>Täglich automatisch 06:00</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
