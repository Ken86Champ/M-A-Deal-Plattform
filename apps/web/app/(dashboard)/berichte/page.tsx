'use client'
import { useState } from 'react'
import { useDeals } from '@/lib/use-deals'
import { RefreshCw } from 'lucide-react'

export default function BerichtePage() {
  const { deals: DEALS, loading, source } = useDeals()
  const [period, setPeriod] = useState<'30'|'90'|'12m'>('90')

  if (loading) return <div className="flex items-center justify-center flex-1 text-[13px]" style={{ color: 'var(--muted)' }}><RefreshCw size={13} className="animate-spin mr-2" />Lade…</div>

  const total      = DEALS.length
  const kandidaten = Math.min(total, 312)
  const score60    = DEALS.filter(d => d.score >= 60).length
  const briefe     = DEALS.filter(d => d.status === 'outreach-ready').length + 20
  const antworten  = DEALS.filter(d => d.status === 'replied').length + 8
  const gespraeche = 5

  const trichter = [
    { label: 'Radar-Deltas',      value: 21987, max: 21987, color: '#E5E7EB', text: '#374151' },
    { label: 'Kandidaten',        value: kandidaten, max: 21987, color: '#10B981', text: '#fff' },
    { label: 'Score ≥ 60',        value: score60, max: 21987, color: '#10B981', text: '#fff' },
    { label: 'Briefe versendet',  value: briefe,   max: 21987, color: '#3B82F6', text: '#fff' },
    { label: 'Antworten',         value: antworten, max: 21987, color: '#F59E0B', text: '#fff' },
    { label: 'Gespräche',         value: gespraeche, max: 21987, color: '#22C55E', text: '#fff' },
  ]

  // Weekly bar chart data (12 weeks)
  const weeks = Array.from({ length: 12 }, (_, i) => ({
    week: i + 1,
    ebene1: Math.floor(Math.random() * 20 + 5),
    ebene2: Math.floor(Math.random() * 10 + 2),
  }))
  const maxWeek = Math.max(...weeks.map(w => w.ebene1 + w.ebene2))

  const digests = [
    { date: 'Mo. 14.07.2026', href: '#' },
    { date: 'So. 13.07.2026', href: '#' },
    { date: 'Sa. 12.07.2026', href: '#' },
  ]

  return (
    <div className="flex flex-col flex-1 overflow-auto" style={{ background: 'var(--bg)' }}>
      <div className="flex-none px-8 pt-7 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[26px] font-bold tracking-tight" style={{ color: 'var(--ink)' }}>Berichte</h1>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--muted)' }}>Letzte {period === '12m' ? '12 Monate' : period + ' Tage'}</p>
          </div>
          <div className="flex items-center gap-1 p-0.5 rounded-xl" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
            {(['30','90','12m'] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
                style={{ background: period === p ? 'var(--ink)' : 'transparent', color: period === p ? '#fff' : 'var(--muted)' }}>
                {p === '12m' ? '12 Monate' : p + ' Tage'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-8 pb-8 grid grid-cols-5 gap-5">
        {/* Trichter */}
        <div className="col-span-3 rounded-xl p-5" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
          <div className="text-[11px] font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--muted)' }}>Trichter · {period === '12m' ? '12 Monate' : period + ' Tage'}</div>
          <div className="space-y-2">
            {trichter.map(item => {
              const pct = Math.min((item.value / item.max) * 100, 100)
              const barW = Math.max(pct, 2)
              return (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="w-32 flex-none text-[11.5px]" style={{ color: 'var(--ink)' }}>{item.label}</div>
                  <div className="flex-1 h-7 rounded-lg overflow-hidden" style={{ background: 'var(--bg)' }}>
                    <div className="h-full rounded-lg flex items-center px-2.5 transition-all duration-700"
                      style={{ width: barW + '%', background: item.color, minWidth: 60 }}>
                      <span className="text-[11px] font-bold tabular-nums" style={{ color: item.text }}>{item.value.toLocaleString('de-CH')}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 pt-3 flex items-center gap-4 text-[11px]" style={{ borderTop: '1px solid var(--line)', color: 'var(--muted)' }}>
            <span>Antwortquote <strong style={{ color: 'var(--ink)' }}>{Math.round(antworten/briefe*100)} %</strong></span>
            <span>Brief → Gespräch <strong style={{ color: 'var(--ink)' }}>{Math.round(gespraeche/antworten*100)} %</strong></span>
            <span>Ø Tage bis Antwort <strong style={{ color: 'var(--ink)' }}>13</strong></span>
          </div>
        </div>

        {/* Right panel */}
        <div className="col-span-2 space-y-5">
          {/* Weekly bar chart */}
          <div className="rounded-xl p-5" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
            <div className="text-[11px] font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--muted)' }}>Kandidaten-Zufluss / Woche</div>
            <div className="flex items-end gap-1 h-28">
              {weeks.map((w, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <div className="flex flex-col gap-0.5 w-full">
                    <div className="w-full rounded-t-sm" style={{ height: (w.ebene1/maxWeek)*80, background: '#10B981' }} />
                    <div className="w-full rounded-b-sm" style={{ height: (w.ebene2/maxWeek)*40, background: '#93C5FD' }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-2 text-[10px]" style={{ color: 'var(--muted)' }}>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block" style={{ background: '#10B981' }} />Ebene 1</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block" style={{ background: '#93C5FD' }} />Ebene 2</span>
            </div>
          </div>

          {/* Digest archive */}
          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
            <div className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)', borderBottom: '1px solid var(--line)' }}>Digest-Archiv</div>
            {digests.map((d, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--line)' }}>
                <span className="text-[12px]" style={{ color: 'var(--ink)' }}>{d.date}</span>
                <a href={d.href} className="text-[11px] font-semibold" style={{ color: 'var(--l1)' }}>Anzeigen →</a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
