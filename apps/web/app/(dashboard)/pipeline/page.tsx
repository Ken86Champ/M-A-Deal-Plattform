'use client'
import { useRef, useState } from 'react'
import { useDeals } from '@/lib/use-deals'
import { Play, Square, RefreshCw, Zap, Search, TrendingUp, LayoutList, ChevronRight } from 'lucide-react'
import Link from 'next/link'

const STAGE_ORDER = [
  { id: 'new-qualified',  label: 'Neu & Qualifiziert', color: '#5C6EFF' },
  { id: 'in-review',      label: 'In Prüfung',         color: '#8B5CF6' },
  { id: 'shortlisted',    label: 'Shortlist',           color: '#00B88A' },
  { id: 'outreach-ready', label: 'Outreach bereit',     color: '#E8920A' },
  { id: 'contacted',      label: 'Kontaktiert',         color: '#0EA5E9' },
  { id: 'replied',        label: 'Geantwortet',         color: '#10B981' },
  { id: 'negotiation',    label: 'Verhandlung',         color: '#F6BE45' },
  { id: 'won',            label: 'Gewonnen',            color: '#00B88A' },
]

type RunStage = 'process' | 'all' | 'radar' | 'enrichment' | 'scoring'
type RunState = 'idle' | 'running' | 'done' | 'error'

const RUN_STAGES: { id: RunStage; label: string; desc: string; color: string }[] = [
  { id: 'process',    label: 'Verarbeiten',   desc: 'Anreichern + Scoren (kein Scan)',                          color: 'var(--go)' },
  { id: 'all',        label: 'Alles',         desc: 'Vollständige Pipeline: Radar → Anreichern → Scoren',       color: 'var(--l2)' },
  { id: 'radar',      label: 'Radar',         desc: 'Neue Firmen aus Zefix + Plattformen',                      color: 'var(--l1)' },
  { id: 'enrichment', label: 'Anreichern',    desc: 'Websites besuchen, Inhaberdaten extrahieren',              color: 'var(--amber)' },
  { id: 'scoring',    label: 'Scoren',        desc: 'Score berechnen, KO-Gates setzen',                        color: 'var(--amber)' },
]

export default function FunnelPage() {
  const { deals: DEALS, loading } = useDeals()
  const [runState,    setRunState]    = useState<RunState>('idle')
  const [activeStage, setActiveStage] = useState<RunStage | null>(null)
  const [logs,        setLogs]        = useState<string[]>([])
  const abortRef  = useRef<AbortController | null>(null)
  const logBoxRef = useRef<HTMLDivElement>(null)

  const stageCounts = STAGE_ORDER.map(s => ({
    ...s,
    count: DEALS.filter(d => d.pipelineStage === s.id).length,
  }))
  const totalActive = stageCounts.reduce((acc, s) => acc + s.count, 0)
  const maxCount    = Math.max(...stageCounts.map(s => s.count), 1)

  async function startStage(stage: RunStage) {
    if (runState === 'running') return
    setLogs([])
    setRunState('running')
    setActiveStage(stage)
    abortRef.current = new AbortController()
    try {
      const res = await fetch(`/api/pipeline/run?stage=${stage}`, { signal: abortRef.current.signal })
      if (!res.body) { setLogs(['[Kein Stream]']); setRunState('error'); return }
      const reader = res.body.getReader()
      const dec    = new TextDecoder()
      let   buf    = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const parts = buf.split('\n\n')
        buf = parts.pop() ?? ''
        for (const part of parts) {
          const line = part.replace(/^data:\s?/, '').trim()
          if (line) setLogs(prev => { const next = [...prev, line]; setTimeout(() => { if (logBoxRef.current) logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight }, 0); return next })
        }
      }
      setRunState('done')
    } catch (e: any) {
      if (e?.name === 'AbortError') { setLogs(prev => [...prev, '[Abgebrochen]']); setRunState('idle') }
      else { setLogs(prev => [...prev, `[Fehler: ${e?.message}]`]); setRunState('error') }
    } finally { setActiveStage(null) }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="flex-none px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--line)', background: 'var(--panel)' }}>
        <div>
          <div className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'var(--muted)' }}>Origination</div>
          <h1 className="text-[18px] font-semibold tracking-tight mt-0.5" style={{ color: 'var(--ink)' }}>Pipeline Funnel</h1>
        </div>
        <Link href="/deals" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium" style={{ background: 'var(--bg)', color: 'var(--muted)', border: '1px solid var(--line)' }}>
          <LayoutList size={12} /> Kanban-Ansicht
        </Link>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">

        {/* Funnel visualization */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--line)' }}>
            <p className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Deal Funnel</p>
            <span className="text-[11px]" style={{ color: 'var(--muted)' }}>{totalActive} aktive Deals</span>
          </div>
          <div className="p-6 space-y-1.5">
            {loading ? (
              <div className="flex items-center justify-center h-40 text-[12px]" style={{ color: 'var(--muted)' }}>
                <RefreshCw size={13} className="animate-spin mr-2" /> Lade…
              </div>
            ) : (
              stageCounts.map((s, i) => {
                const pct = (s.count / maxCount) * 100
                const indent = ((maxCount - s.count) / maxCount) * 18
                return (
                  <Link key={s.id} href={`/inbox?stage=${s.id}`}>
                    <div className="flex items-center gap-3 group cursor-pointer" style={{ paddingLeft: `${indent}%`, paddingRight: `${indent}%` }}>
                      <div
                        className="flex-1 flex items-center justify-between px-4 py-2.5 rounded-xl transition-opacity hover:opacity-90"
                        style={{ background: s.color + '20', border: `1px solid ${s.color}44` }}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-2 h-2 rounded-full flex-none" style={{ background: s.color }} />
                          <span className="text-[12px] font-medium" style={{ color: 'var(--ink)' }}>{s.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-bold font-mono" style={{ color: s.color }}>{s.count}</span>
                          <ChevronRight size={12} style={{ color: 'var(--muted)' }} />
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </div>

        {/* Pipeline Runner */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
          <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--line)' }}>
            <p className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Pipeline ausführen</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>KI-Agenten manuell starten</p>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-3 gap-2 mb-4">
              {RUN_STAGES.map(s => (
                <button
                  key={s.id}
                  onClick={() => startStage(s.id)}
                  disabled={runState === 'running'}
                  className="flex flex-col items-start gap-1 p-3 rounded-xl text-left transition-all disabled:opacity-50"
                  style={{ background: activeStage === s.id ? s.color + '20' : 'var(--bg)', border: `1px solid ${activeStage === s.id ? s.color + '60' : 'var(--line)'}` }}
                >
                  <span className="text-[12px] font-semibold" style={{ color: activeStage === s.id ? s.color : 'var(--ink)' }}>{s.label}</span>
                  <span className="text-[10px]" style={{ color: 'var(--muted)' }}>{s.desc}</span>
                </button>
              ))}
            </div>
            {logs.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--muted)' }}>Live-Log</span>
                  {runState === 'running' && (
                    <button onClick={() => abortRef.current?.abort()} className="text-[10px] px-2 py-0.5 rounded" style={{ background: 'var(--red)', color: '#fff' }}>
                      <Square size={10} className="inline mr-1" /> Stop
                    </button>
                  )}
                </div>
                <div
                  ref={logBoxRef}
                  className="h-40 overflow-y-auto p-3 rounded-xl font-mono text-[11px] space-y-0.5"
                  style={{ background: '#0C0F1C', color: '#A0F0C0' }}
                >
                  {logs.map((l, i) => <div key={i}>{l}</div>)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
