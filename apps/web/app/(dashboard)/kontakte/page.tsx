'use client'
import Link from 'next/link'
import { useDeals } from '@/lib/use-deals'
import { scoreBg, scoreColor, type Deal } from '@/lib/mock-data'
import { RefreshCw, Download } from 'lucide-react'

const COLS = [
  { id: 'contacted', label: 'Versendet', color: '#10B981', bg: '#D1FAE5' },
  { id: 'replied',   label: 'Antwort erhalten', color: '#3B82F6', bg: '#DBEAFE' },
  { id: 'shortlisted', label: 'NDA', color: '#F59E0B', bg: '#FEF3C7' },
  { id: 'outreach-ready', label: 'Gespräch', color: '#8B5CF6', bg: '#EDE9FE' },
]

const WIEDERVORLAGEN = [
  { name: 'Rüegg Verpackungen AG', reason: '«Inhaber will erst 2027 entscheiden»', date: '12.01.2027', status: 'Fällig/heute', statusColor: '#EF4444' },
  { name: 'Nachpflege Werner AG', reason: 'Kein Interesse, in 12 Mt. erneut', date: '22.01.2027', status: 'geplant', statusColor: '#6B7280' },
  { name: 'Gasser Holzbau GmbH', reason: 'Nachfolge-Diskurs in Prüfung', date: '01.01.2026', status: 'geplant', statusColor: '#6B7280' },
]

export default function KontaktePage() {
  const { deals: DEALS, loading } = useDeals()

  if (loading) return <div className="flex items-center justify-center flex-1 text-[13px]" style={{ color: 'var(--muted)' }}><RefreshCw size={13} className="animate-spin mr-2" />Lade…</div>

  const total     = DEALS.filter(d => ['contacted','replied','shortlisted','outreach-ready'].includes(d.pipelineStage ?? d.status)).length
  const repQuote  = 16

  return (
    <div className="flex flex-col flex-1 overflow-auto" style={{ background: 'var(--bg)' }}>
      <div className="flex-none px-8 pt-7 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[26px] font-bold tracking-tight" style={{ color: 'var(--ink)' }}>Kontakte</h1>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--muted)' }}>{total} laufende Kontakte · Antwortquote 90 Tage: {repQuote} %</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 rounded-lg text-[12px] font-semibold" style={{ background: '#FEF3C7', color: '#D97706', border: '1px solid #FDE68A' }}>
              3 Wiedervorlagen fällig
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px]" style={{ background: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--muted)' }}>
              <Download size={13} /> Export
            </button>
          </div>
        </div>
      </div>

      {/* Kanban */}
      <div className="px-8 pb-4 grid grid-cols-4 gap-4">
        {COLS.map(col => {
          const colDeals = DEALS
            .filter(d => d.status === col.id || d.pipelineStage === col.id)
            .slice(0, 3)
          return (
            <div key={col.id} className="rounded-xl overflow-hidden" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
              <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid var(--line)' }}>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                  <span className="text-[12px] font-semibold" style={{ color: 'var(--ink)' }}>{col.label}</span>
                </div>
                <span className="text-[11px] font-bold" style={{ color: col.color }}>{colDeals.length}</span>
              </div>
              <div className="p-3 space-y-2">
                {colDeals.map(deal => (
                  <Link key={deal.id} href={'/firma/'+deal.id}
                    className="block p-3 rounded-xl hover:shadow-sm transition-all" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-[11.5px] font-semibold truncate" style={{ color: 'var(--ink)' }}>{deal.name}</div>
                        <div className="text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>Brief versendet {Math.floor(Math.random()*7+1)}.07.</div>
                      </div>
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold flex-none"
                        style={{ background: scoreBg(deal.score), color: scoreColor(deal.score) }}>{deal.score}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-1">
                      {col.id === 'replied' && (
                        <button className="text-[10px] px-2 py-0.5 rounded font-semibold text-white" style={{ background: 'var(--l1)' }}>Antwort öffnen</button>
                      )}
                      {col.id === 'shortlisted' && (
                        <span className="text-[10px]" style={{ color: 'var(--muted)' }}>NDA keine {Math.floor(Math.random()*10+1)} Tage</span>
                      )}
                      <span className="text-[9px] font-mono ml-auto" style={{ color: 'var(--muted)' }}>B{Math.floor(Math.random()*3+1)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Wiedervorlagen */}
      <div className="mx-8 mb-6 rounded-xl overflow-hidden" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--line)' }}>
          <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Wiedervorlagen</span>
          <span className="text-[11px]" style={{ color: 'var(--muted)' }}>Kandidat bleibt aktioniert, basiert am Rhythmus in der Inbox auf</span>
        </div>
        <table className="w-full border-collapse">
          <tbody>
            {WIEDERVORLAGEN.map((item, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--line)' }}>
                <td className="px-5 py-3 text-[12.5px] font-semibold" style={{ color: 'var(--ink)' }}>{item.name}</td>
                <td className="px-5 py-3 text-[12px]" style={{ color: 'var(--muted)' }}>{item.reason}</td>
                <td className="px-5 py-3 text-[12px] font-mono" style={{ color: 'var(--muted)' }}>{item.date}</td>
                <td className="px-5 py-3">
                  <span className="text-[10px] font-semibold" style={{ color: item.statusColor }}>{item.status}</span>
                </td>
                <td className="px-5 py-3">
                  {item.status === 'Fällig/heute' && (
                    <Link href="#" className="text-[11px] font-semibold underline" style={{ color: 'var(--l2)' }}>In Inbox öffnen →</Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
