'use client'
import { useState, useEffect } from 'react'
import { PIPELINE_STAGES, scoreColor, scoreBg, type Deal, type PipelineStage } from '@/lib/mock-data'
import { useDeals } from '@/lib/use-deals'
import { ChevronDown } from 'lucide-react'

function ScorePip({ score }: { score: number }) {
  return (
    <span
      className="inline-flex items-center justify-center w-8 h-6 rounded-md text-[11px] font-bold tabular-nums font-mono"
      style={{ background: scoreBg(score), color: scoreColor(score) }}
    >
      {score}
    </span>
  )
}

function TypeDot({ type }: { type: Deal['type'] }) {
  return (
    <span
      className="w-1.5 h-1.5 rounded-full flex-none"
      style={{ background: type === 'off-market' ? 'var(--l1)' : 'var(--l2)' }}
    />
  )
}

function DealCard({
  deal,
  onMove,
}: {
  deal: Deal
  onMove: (deal: Deal, stage: PipelineStage) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div
      className="rounded-xl p-3 space-y-2"
      style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}
    >
      <div className="flex items-start gap-2">
        <ScorePip score={deal.score} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <TypeDot type={deal.type} />
            <p className="text-[12px] font-semibold truncate" style={{ color: 'var(--ink)' }}>
              {deal.name}
            </p>
          </div>
          <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--muted)' }}>
            {deal.canton} · {deal.industry.split('/')[0].trim()}
          </p>
        </div>
      </div>

      <p className="text-[10px] leading-relaxed" style={{ color: 'var(--muted)' }}>
        {deal.dealReason}
      </p>

      {/* Move dropdown */}
      <div className="relative">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center justify-between w-full px-2 py-1.5 rounded-lg text-[10px] font-medium transition-colors"
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--line)',
            color: 'var(--muted)',
          }}
        >
          <span>Verschieben</span>
          <ChevronDown size={10} />
        </button>
        {open && (
          <div
            className="absolute left-0 right-0 mt-1 rounded-xl overflow-hidden shadow-lg z-10"
            style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}
          >
            {PIPELINE_STAGES.filter(s => s.id !== deal.pipelineStage).map(s => (
              <button
                key={s.id}
                onClick={() => { onMove(deal, s.id); setOpen(false) }}
                className="w-full text-left px-3 py-2 text-[11px] transition-colors"
                style={{ color: 'var(--ink)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                → {s.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function DealsPage() {
  const { deals: liveDeals, loading, source } = useDeals()
  const [deals, setDeals] = useState<Deal[]>([])
  useEffect(() => { if (liveDeals.length) setDeals(liveDeals) }, [liveDeals])

  const staged: Record<PipelineStage, Deal[]> = {} as any
  for (const s of PIPELINE_STAGES) staged[s.id] = []
  for (const d of deals) staged[d.pipelineStage]?.push(d)

  function moveDeeal(deal: Deal, newStage: PipelineStage) {
    setDeals(prev =>
      prev.map(d => d.id === deal.id ? { ...d, pipelineStage: newStage } : d)
    )
  }

  const VISIBLE_STAGES = PIPELINE_STAGES.filter(s => s.id !== 'won')

  if (loading) return (
    <div className="flex items-center justify-center h-64" style={{ color: 'var(--muted)' }}>
      <span className="text-[13px]">Lade Pipeline…</span>
    </div>
  )

  return (
    <div className="h-[calc(100vh-50px)] flex flex-col">
      {/* Header */}
      <div
        className="flex-none px-6 py-3 flex items-center gap-4"
        style={{ borderBottom: '1px solid var(--line)', background: 'var(--panel)' }}
      >
        <h1 className="text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>
          Deal Pipeline
        </h1>
        <div className="flex items-center gap-3">
          {[
            { label: 'Off-Market', color: 'var(--l1)' },
            { label: 'On-Market', color: 'var(--l2)' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: l.color }} />
              <span className="text-[11px]" style={{ color: 'var(--muted)' }}>{l.label}</span>
            </div>
          ))}
        </div>
        <div className="ml-auto text-[12px]" style={{ color: 'var(--muted)' }}>
          {deals.filter(d => !['rejected', 'won'].includes(d.pipelineStage)).length} aktive Deals
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full gap-0" style={{ minWidth: VISIBLE_STAGES.length * 220 }}>
          {VISIBLE_STAGES.map((stage, i) => {
            const stagDeals = staged[stage.id] ?? []
            return (
              <div
                key={stage.id}
                className="flex flex-col"
                style={{
                  width: 220,
                  minWidth: 220,
                  borderRight: i < VISIBLE_STAGES.length - 1 ? '1px solid var(--line)' : 'none',
                }}
              >
                {/* Column header */}
                <div
                  className="flex-none flex items-center justify-between px-3 py-2.5"
                  style={{ borderBottom: '1px solid var(--line)' }}
                >
                  <span className="text-[11px] font-semibold" style={{ color: 'var(--ink)' }}>
                    {stage.label}
                  </span>
                  {stagDeals.length > 0 && (
                    <span
                      className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: 'var(--bg)', color: 'var(--muted)' }}
                    >
                      {stagDeals.length}
                    </span>
                  )}
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {stagDeals.length === 0 ? (
                    <div
                      className="h-20 rounded-xl border-dashed flex items-center justify-center text-[10px]"
                      style={{ border: '1px dashed var(--line)', color: 'var(--muted)' }}
                    >
                      Leer
                    </div>
                  ) : (
                    stagDeals
                      .sort((a, b) => b.score - a.score)
                      .map(deal => (
                        <DealCard key={deal.id} deal={deal} onMove={moveDeeal} />
                      ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
