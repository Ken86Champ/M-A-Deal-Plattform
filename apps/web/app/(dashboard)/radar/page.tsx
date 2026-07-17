'use client'
import { useDeals } from '@/lib/use-deals'
import { type Deal } from '@/lib/mock-data'
import { RefreshCw, ChevronDown, ExternalLink } from 'lucide-react'
import Link from 'next/link'

function TiagePill({ stage }: { stage: string }) {
  const isNew = stage === 'new-qualified'
  return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
    style={{ background: isNew ? '#D1FAE5' : '#FEF3C7', color: isNew ? '#059669' : '#D97706' }}>
    {isNew ? 'Übernommen' : 'Offen'}
  </span>
}

export default function RadarPage() {
  const { deals: DEALS, loading } = useDeals()
  const offMarket = DEALS.filter(d => d.type === 'off-market').slice(0, 5)
  const onMarket  = DEALS.filter(d => d.type === 'on-market').slice(0, 4)

  return (
    <div className="flex flex-col flex-1 overflow-auto" style={{ background: 'var(--bg)' }}>
      <div className="flex-none px-8 pt-7 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[26px] font-bold tracking-tight" style={{ color: 'var(--ink)' }}>Radar</h1>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--muted)' }}>
              Delta-Scan heute 06:00 · {offMarket.length} Off-Market-Deltas · {onMarket.length} On-Market-Inserate
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 rounded-lg text-[12px]" style={{ background: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--muted)' }}>
              Scan-Histori
            </button>
            <button className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white" style={{ background: 'var(--ink)' }}>
              Erfluss jetzt starten
            </button>
          </div>
        </div>
      </div>

      <div className="px-8 pb-8 space-y-5">
        {/* Ebene 1 - Off-Market */}
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--l1-line)', background: 'var(--panel)' }}>
          <div className="flex items-center justify-between px-5 py-3" style={{ background: 'var(--l1-soft)', borderBottom: '1px solid var(--l1-line)' }}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: 'var(--l1)' }} />
              <span className="text-[13px] font-semibold" style={{ color: '#065F46' }}>Ebene 1 - Off-Market</span>
              <span className="text-[11px]" style={{ color: '#059669' }}>Register &amp; Eigenrecherche — Firmen, die nicht zum Verkauf stehen</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-semibold" style={{ color: '#059669' }}>
              <span>SHAB · {offMarket.length}+</span>
              <span>Zefix · {Math.ceil(offMarket.length/2)}+</span>
              <span>Eigenrecherche · 1+</span>
            </div>
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ background: 'var(--bg)' }}>
                {['QUELLE','FIRMA','EREIS / SIGNAL','KANTON','TRIAGE','AKTION'].map(h => (
                  <th key={h} className="px-4 py-2 text-left text-[9px] font-semibold tracking-wider uppercase" style={{ color: 'var(--muted)', borderBottom: '1px solid var(--line)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {offMarket.map((deal, i) => (
                <tr key={deal.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td className="px-4 py-2.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: i%2===0?'#DBEAFE':'#D1FAE5', color: i%2===0?'#1D4ED8':'#065F46' }}>
                      {i%2===0?'SHAB':'Zefix'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="text-[12px] font-semibold" style={{ color: 'var(--ink)' }}>{deal.name}</div>
                    <div className="text-[10px] font-mono" style={{ color: 'var(--muted)' }}>CHF-{Math.floor(Math.random()*999+100)}.{Math.floor(Math.random()*999+100)} · {deal.industry.split('/')[0].trim()}</div>
                  </td>
                  <td className="px-4 py-2.5 text-[11px]" style={{ color: 'var(--muted)' }}>
                    {i%3===0?'VR-Mutation: Austritt Gründer':i%3===1?'Statutenänderung: Zweck erweitert':'Adressänderung + neuer VR'}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[12px] font-semibold" style={{ color: 'var(--ink)' }}>{deal.canton}</td>
                  <td className="px-4 py-2.5"><TiagePill stage={deal.pipelineStage} /></td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Link href={'/firma/'+deal.id} className="text-[11px] font-semibold" style={{ color: 'var(--l2)' }}>Öffnen</Link>
                      <span style={{ color: 'var(--line)' }}>·</span>
                      <button className="text-[11px]" style={{ color: 'var(--muted)' }}>Verwerfen</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-5 py-2" style={{ borderTop: '1px solid var(--line)' }}>
            <button className="text-[11px] font-semibold" style={{ color: 'var(--l1)' }}>Alle {offMarket.length} Off-Market-Deltas anzeigen ↓</button>
          </div>
        </div>

        {/* Ebene 2 - On-Market */}
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--l2-line)', background: 'var(--panel)' }}>
          <div className="flex items-center justify-between px-5 py-3" style={{ background: 'var(--l2-soft)', borderBottom: '1px solid var(--l2-line)' }}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: 'var(--l2)' }} />
              <span className="text-[13px] font-semibold" style={{ color: '#1E3A8A' }}>Ebene 2 - On-Market</span>
              <span className="text-[11px]" style={{ color: '#1D4ED8' }}>Aktiv inserierte Firmen auf Verkaufsplattformen</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-semibold" style={{ color: '#1D4ED8' }}>
              <span>companymarket.ch · {Math.ceil(onMarket.length/2)}+</span>
              <span>firmenboerse.com · {Math.floor(onMarket.length/2)}+</span>
              <Link href="/einstellungen/quellen" className="underline">Plattformen verwalten</Link>
            </div>
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ background: 'var(--bg)' }}>
                {['PLATTFORM','INSERAT','EREIS','REGION','TRIAGE','AKTION'].map(h => (
                  <th key={h} className="px-4 py-2 text-left text-[9px] font-semibold tracking-wider uppercase" style={{ color: 'var(--muted)', borderBottom: '1px solid var(--line)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {onMarket.map((deal, i) => (
                <tr key={deal.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td className="px-4 py-2.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: '#DBEAFE', color: '#1D4ED8' }}>
                      {i%2===0?'companymarket':'firmenboerse'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="text-[12px] font-semibold" style={{ color: 'var(--ink)' }}>{deal.name}</div>
                    <div className="text-[10px]" style={{ color: 'var(--muted)' }}>Inserat {Math.floor(Math.random()*99000+10000)} · {deal.industry.split('/')[0].trim()}</div>
                  </td>
                  <td className="px-4 py-2.5 text-[11px]" style={{ color: 'var(--muted)' }}>
                    {i%2===0?'Preisänderung erkannt':'Neu inseriert · anonymisiert'}
                  </td>
                  <td className="px-4 py-2.5 text-[12px] font-mono" style={{ color: 'var(--ink)' }}>{deal.canton}{i%3===0?'/SO':''}</td>
                  <td className="px-4 py-2.5"><TiagePill stage={i%2===0?'new-qualified':'in-review'} /></td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Link href={'/firma/'+deal.id} className="text-[11px] font-semibold" style={{ color: 'var(--l2)' }}>Öffnen</Link>
                      <span style={{ color: 'var(--line)' }}>·</span>
                      <button className="text-[11px]" style={{ color: 'var(--muted)' }}>Verwerfen</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-5 py-2" style={{ borderTop: '1px solid var(--line)' }}>
            <button className="text-[11px] font-semibold" style={{ color: 'var(--l2)' }}>Alle {onMarket.length} On-Market-Inserate anzeigen ↓</button>
          </div>
        </div>
      </div>
    </div>
  )
}
