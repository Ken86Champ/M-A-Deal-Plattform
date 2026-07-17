'use client'
import { useEffect, useState } from 'react'
import { AlertTriangle, Check, X, Edit2 } from 'lucide-react'
import { useDeals } from '@/lib/use-deals'
import { scoreBg, scoreColor, type Deal } from '@/lib/mock-data'
import Link from 'next/link'

const LETTER_TEMPLATE = (name: string, industry: string) => `Sehr geehrter Herr / Sehr geehrte Frau ${name.split(' ').slice(-1)[0]},

Ihr Unternehmen ist uns durch seine langjährige Verankerung in der ${industry}-Branche aufgefallen. Wir begleiten Inhaberinnen und Inhaber von Schweizer KMU diskret bei Fragen der Nachfolge — ohne Zeitdruck und ohne Verpflichtung.

Falls das Thema Nachfolge für Sie in den nächsten Jahren relevant werden könnte, würden wir uns über ein unverbindliches, vertrauliches Gespräch freuen.

Freundliche Grüsse
M. Keller`

export default function QueuePage() {
  const { deals: DEALS, loading } = useDeals()
  const [selected, setSelected] = useState<Deal | null>(null)
  const [acting, setActing] = useState<string | null>(null)

  const pending = DEALS
    .filter(d => d.status === 'outreach-ready' || d.status === 'reviewed')
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)

  useEffect(() => { if (pending.length && !selected) setSelected(pending[0]) }, [pending.length])

  async function act(deal: Deal, action: 'approve' | 'reject') {
    setActing(deal.id)
    await new Promise(r => setTimeout(r, 600))
    setActing(null)
    if (action === 'approve') window.alert('Brief freigegeben: ' + deal.name)
  }

  if (loading) return <div className="flex items-center justify-center flex-1 text-[13px]" style={{ color: 'var(--muted)' }}>Lade…</div>

  return (
    <div className="flex flex-col flex-1 overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex-none px-8 pt-7 pb-4">
        <h1 className="text-[26px] font-bold tracking-tight" style={{ color: 'var(--ink)' }}>Approval-Queue</h1>
        <p className="text-[12px] mt-0.5" style={{ color: 'var(--muted)' }}>{pending.length} Briefentwürfe warten auf Freigabe</p>
      </div>

      {/* Warning */}
      <div className="mx-8 mb-4 flex items-center gap-2.5 px-4 py-3 rounded-xl" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
        <AlertTriangle size={14} style={{ color: '#D97706', flexShrink: 0 }} />
        <span className="text-[12px]" style={{ color: '#92400E' }}>
          Kein Auto-Versand. Teil-2-Briefe enthalten keinen Preis, Score oder Schwächen.
        </span>
      </div>

      {/* Split panel */}
      <div className="flex-1 flex gap-4 px-8 pb-6 overflow-hidden min-h-0">
        {/* Left: list */}
        <div className="w-72 flex-none flex flex-col rounded-xl overflow-hidden" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
          <div className="flex-1 overflow-auto divide-y" style={{ borderColor: 'var(--line)' }}>
            {pending.map(deal => (
              <button key={deal.id} onClick={() => setSelected(deal)}
                className="w-full text-left px-4 py-3.5 hover:bg-slate-50 transition-colors"
                style={{ background: selected?.id === deal.id ? '#F0FDF4' : 'transparent', borderLeft: selected?.id === deal.id ? '3px solid var(--l1)' : '3px solid transparent' }}>
                <div className="flex items-start gap-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#D1FAE5', color: '#065F46' }}>Freigabe</span>
                      <span className="text-[9px]" style={{ color: 'var(--muted)' }}>An: {deal.name.split(' ')[0].toUpperCase() === deal.name.split(' ')[0] ? deal.name.split(' ').slice(0,2).join(' ') : deal.name.split(' ')[0]}</span>
                    </div>
                    <div className="text-[12px] font-semibold truncate" style={{ color: 'var(--ink)' }}>{deal.name}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>Teil-2-Brief bereit</div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--l2-soft)', color: 'var(--l2)' }}>Persönlicher Brief</span>
                      <span className="text-[10px]" style={{ color: 'var(--muted)' }}>1 Kontakt</span>
                    </div>
                  </div>
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-[12px] font-bold flex-none"
                    style={{ background: scoreBg(deal.score), color: scoreColor(deal.score) }}>{deal.score}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: letter */}
        {selected ? (
          <div className="flex-1 flex flex-col rounded-xl overflow-hidden" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
            <div className="flex items-center justify-between px-6 py-4 flex-none" style={{ borderBottom: '1px solid var(--line)' }}>
              <div>
                <div className="text-[14px] font-semibold" style={{ color: 'var(--ink)' }}>Teil-2-Brief · {selected.name}</div>
                <div className="flex items-center gap-3 mt-1">
                  {['Kein Preis','Kein Score','Keine Schwächen'].map(l => (
                    <span key={l} className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: '#059669' }}>
                      <Check size={11} /> {l}
                    </span>
                  ))}
                </div>
              </div>
              <button className="text-[11px] flex items-center gap-1" style={{ color: 'var(--l2)' }}>
                <Edit2 size={12} /> Bearbeiten
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <div className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--ink)', fontFamily: 'Georgia, serif' }}>
                {LETTER_TEMPLATE(selected.name, selected.industry.split('/')[0].trim())}
              </div>
            </div>
            <div className="flex items-center gap-3 px-6 py-4 flex-none" style={{ borderTop: '1px solid var(--line)' }}>
              <button
                onClick={() => act(selected, 'approve')}
                disabled={!!acting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all disabled:opacity-60"
                style={{ background: 'var(--l1)' }}>
                <Check size={14} /> Freigeben &amp; versenden
              </button>
              <button className="px-4 py-2.5 rounded-xl text-[13px] font-medium" style={{ background: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                Bearbeiten
              </button>
              <button
                onClick={() => act(selected, 'reject')}
                className="px-4 py-2.5 rounded-xl text-[13px] font-medium" style={{ color: '#EF4444' }}>
                Ablehnen
              </button>
              <span className="ml-auto text-[10px]" style={{ color: 'var(--muted)' }}>Freigabe wird protokolliert (Audit-Log)</span>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center rounded-xl" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
            <p className="text-[13px]" style={{ color: 'var(--muted)' }}>Brief auswählen</p>
          </div>
        )}
      </div>
    </div>
  )
}
