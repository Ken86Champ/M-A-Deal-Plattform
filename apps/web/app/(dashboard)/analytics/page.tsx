'use client'
import { useDeals } from '@/lib/use-deals'
import { scoreColor } from '@/lib/mock-data'
import { RefreshCw } from 'lucide-react'

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--line)' }}>
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(value / max) * 100}%`, background: color }} />
    </div>
  )
}

export default function AnalyticsPage() {
  const { deals: DEALS, loading, source } = useDeals()

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-[13px]" style={{ color: 'var(--muted)' }}>
      <RefreshCw size={14} className="animate-spin mr-2" /> Lade…
    </div>
  )

  // Score distribution buckets
  const buckets = [
    { label: '≥ 75',   deals: DEALS.filter(d => d.score >= 75), color: '#00B88A' },
    { label: '60–74',  deals: DEALS.filter(d => d.score >= 60 && d.score < 75), color: '#10B981' },
    { label: '45–59',  deals: DEALS.filter(d => d.score >= 45 && d.score < 60), color: '#E8920A' },
    { label: '< 45',   deals: DEALS.filter(d => d.score < 45), color: '#C8CDDF' },
  ]
  const maxBucket = Math.max(...buckets.map(b => b.deals.length))

  // Top industries
  const industryMap: Record<string, number> = {}
  DEALS.forEach(d => {
    const key = d.industry.split('/')[0].trim()
    industryMap[key] = (industryMap[key] ?? 0) + 1
  })
  const topIndustries = Object.entries(industryMap).sort((a, b) => b[1] - a[1]).slice(0, 8)
  const maxInd = Math.max(...topIndustries.map(i => i[1]))

  // Stage distribution
  const stageMap: Record<string, { count: number; color: string }> = {
    'new-qualified':  { count: 0, color: '#5C6EFF' },
    'in-review':      { count: 0, color: '#8B5CF6' },
    'shortlisted':    { count: 0, color: '#00B88A' },
    'outreach-ready': { count: 0, color: '#E8920A' },
    'contacted':      { count: 0, color: '#0EA5E9' },
    'replied':        { count: 0, color: '#10B981' },
    'negotiation':    { count: 0, color: '#F6BE45' },
  }
  DEALS.forEach(d => { if (stageMap[d.pipelineStage]) stageMap[d.pipelineStage].count++ })
  const stages = Object.entries(stageMap)
  const maxStage = Math.max(...stages.map(s => s[1].count), 1)

  const offCount  = DEALS.filter(d => d.type === 'off-market').length
  const onCount   = DEALS.filter(d => d.type === 'on-market').length
  const qualified = DEALS.filter(d => d.score >= 60).length
  const avgScore  = Math.round(DEALS.reduce((s, d) => s + d.score, 0) / (DEALS.length || 1))
  const cantons   = [...new Set(DEALS.map(d => d.canton))].length

  const STATS = [
    { label: 'Deals gesamt', value: DEALS.length,  color: 'var(--ink)'   },
    { label: 'Off-Market',   value: offCount,       color: 'var(--l1)'    },
    { label: 'On-Market',    value: onCount,        color: 'var(--l2)'    },
    { label: 'Qualifiziert', value: qualified,      color: 'var(--go)'    },
    { label: 'Ø Score',      value: avgScore,       color: scoreColor(avgScore), mono: true },
    { label: 'Kantone',      value: cantons,        color: 'var(--muted)' },
  ]

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="flex-none px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--line)', background: 'var(--panel)' }}>
        <div>
          <div className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'var(--muted)' }}>Origination</div>
          <h1 className="text-[18px] font-semibold tracking-tight mt-0.5" style={{ color: 'var(--ink)' }}>Analytics</h1>
        </div>
        {source === 'mock' && (
          <span className="text-[10px] px-2 py-0.5 rounded font-semibold" style={{ background: '#fef3c7', color: '#d97706' }}>Demo-Daten</span>
        )}
      </div>

      {/* Stats strip */}
      <div className="flex-none grid overflow-hidden" style={{ gridTemplateColumns: `repeat(${STATS.length}, 1fr)`, borderBottom: '2px solid var(--line)', background: 'var(--panel)' }}>
        {STATS.map((s, i) => (
          <div key={s.label} className="px-5 py-3 flex flex-col gap-0.5" style={{ borderRight: i < STATS.length - 1 ? '1px solid var(--line)' : 'none' }}>
            <span className="text-[10px] font-medium" style={{ color: 'var(--muted)' }}>{s.label}</span>
            <span className={`text-[22px] font-bold tabular-nums leading-none ${(s as any).mono ? 'font-mono' : ''}`} style={{ color: s.color }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-3 gap-5 max-w-[1200px]">

          {/* Score distribution */}
          <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
            <p className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Score-Verteilung</p>
            <div className="space-y-3">
              {buckets.map(b => (
                <div key={b.label} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span style={{ color: 'var(--muted)' }}>{b.label}</span>
                    <span className="font-bold font-mono" style={{ color: b.color }}>{b.deals.length}</span>
                  </div>
                  <Bar value={b.deals.length} max={maxBucket || 1} color={b.color} />
                </div>
              ))}
            </div>
            <div className="pt-2" style={{ borderTop: '1px solid var(--line)' }}>
              <div className="flex items-center justify-between text-[11px]">
                <span style={{ color: 'var(--muted)' }}>Qualifizierungsrate</span>
                <span className="font-bold font-mono" style={{ color: 'var(--go)' }}>
                  {Math.round((qualified / (DEALS.length || 1)) * 100)}%
                </span>
              </div>
            </div>
          </div>

          {/* Stage distribution */}
          <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
            <p className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Pipeline-Stages</p>
            <div className="space-y-2.5">
              {stages.map(([id, data]) => {
                const label = {
                  'new-qualified': 'Neu', 'in-review': 'Prüfung', 'shortlisted': 'Shortlist',
                  'outreach-ready': 'Outreach', 'contacted': 'Kontakt', 'replied': 'Geantw.', 'negotiation': 'Verhandl.',
                }[id] ?? id
                return (
                  <div key={id} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span style={{ color: 'var(--muted)' }}>{label}</span>
                      <span className="font-bold font-mono" style={{ color: data.color }}>{data.count}</span>
                    </div>
                    <Bar value={data.count} max={maxStage} color={data.color} />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Top industries */}
          <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
            <p className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Top Branchen</p>
            <div className="space-y-2.5">
              {topIndustries.map(([ind, count]) => (
                <div key={ind} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="truncate" style={{ color: 'var(--muted)' }}>{ind.substring(0, 28)}</span>
                    <span className="font-bold font-mono flex-none ml-2" style={{ color: 'var(--l2)' }}>{count}</span>
                  </div>
                  <Bar value={count} max={maxInd} color="var(--l2)" />
                </div>
              ))}
            </div>
          </div>

          {/* Source split */}
          <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
            <p className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Quellen-Split</p>
            <div className="space-y-4">
              {[
                { label: 'Off-Market', value: offCount,  color: 'var(--l1)' },
                { label: 'On-Market',  value: onCount,   color: 'var(--l2)' },
              ].map(s => (
                <div key={s.label} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-medium" style={{ color: 'var(--ink)' }}>{s.label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[18px] font-bold font-mono" style={{ color: s.color }}>{s.value}</span>
                      <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
                        ({Math.round((s.value / (DEALS.length || 1)) * 100)}%)
                      </span>
                    </div>
                  </div>
                  <Bar value={s.value} max={DEALS.length || 1} color={s.color} />
                </div>
              ))}
            </div>
          </div>

          {/* Confidence distribution */}
          <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
            <p className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Konfidenz-Level</p>
            <div className="space-y-3">
              {(['A', 'B', 'C'] as const).map(c => {
                const count = DEALS.filter(d => d.confidence === c).length
                const color = c === 'A' ? '#00B88A' : c === 'B' ? '#E8920A' : '#C8CDDF'
                const desc  = c === 'A' ? 'Hoch — amtliche Daten' : c === 'B' ? 'Mittel — Web-Extraktion' : 'Gering — Schätzung'
                return (
                  <div key={c} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[12px] font-bold font-mono" style={{ color }}>{c}</span>
                        <span style={{ color: 'var(--muted)' }}>{desc}</span>
                      </div>
                      <span className="font-bold font-mono" style={{ color }}>{count}</span>
                    </div>
                    <Bar value={count} max={DEALS.length || 1} color={color} />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Summary card */}
          <div className="rounded-2xl p-5 space-y-3" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
            <p className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Übersicht</p>
            {[
              { label: 'Gesamtpipeline', value: DEALS.length.toLocaleString('de-CH') + ' Deals', color: 'var(--ink)' },
              { label: 'Qualifiziert ≥60', value: qualified + ' Deals', color: 'var(--go)' },
              { label: 'Ø Deal-Score', value: avgScore.toString(), color: scoreColor(avgScore), mono: true },
              { label: 'Kantone abgedeckt', value: cantons.toString(), color: 'var(--muted)' },
              { label: 'Off-Market Anteil', value: Math.round((offCount / (DEALS.length || 1)) * 100) + '%', color: 'var(--l1)' },
              { label: 'On-Market Anteil', value: Math.round((onCount / (DEALS.length || 1)) * 100) + '%', color: 'var(--l2)' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid var(--line)' }}>
                <span className="text-[11px]" style={{ color: 'var(--muted)' }}>{item.label}</span>
                <span className={`text-[13px] font-bold ${(item as any).mono ? 'font-mono' : ''}`} style={{ color: item.color }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
