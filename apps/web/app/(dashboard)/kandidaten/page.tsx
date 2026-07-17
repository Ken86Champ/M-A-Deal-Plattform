'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useDeals } from '@/lib/use-deals'
import { scoreColor, scoreBg, type Deal } from '@/lib/mock-data'
import { Search, Download, Plus, ChevronLeft, ChevronRight } from 'lucide-react'

function EbenePill({ type }: { type: Deal['type'] }) {
  const isOff = type === 'off-market'
  return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
    style={{ background: isOff ? 'var(--l1-soft)' : 'var(--l2-soft)', color: isOff ? 'var(--l1)' : 'var(--l2)' }}>
    {isOff ? 'Ebene 1' : 'Ebene 2'}
  </span>
}

function GateDots({ sb }: { sb: Deal['scoreBreakdown'] }) {
  const vals = [sb.strategicFit, sb.companyQuality, sb.salesProbability, sb.outreachPotential, sb.dataQuality]
  return <div className="flex items-center gap-0.5">
    {vals.map((v, i) => <span key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: v >= 60 ? '#22C55E' : v >= 40 ? '#F59E0B' : '#EF4444' }} />)}
  </div>
}

function ScoreBadge({ score }: { score: number }) {
  return <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-[12px] font-bold tabular-nums"
    style={{ background: scoreBg(score), color: scoreColor(score) }}>{score}</span>
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  'new':            { label: 'Neu',         color: '#3B82F6' },
  'reviewed':       { label: 'Dossier',     color: '#8B5CF6' },
  'shortlisted':    { label: 'Shortlisted', color: '#10B981' },
  'outreach-ready': { label: 'Freigabe',    color: '#F59E0B' },
  'contacted':      { label: 'Kontaktiert', color: '#06B6D4' },
  'replied':        { label: 'Geantwortet', color: '#22C55E' },
  'rejected':       { label: 'Archiv',      color: '#9CA3AF' },
}

const PAGE_SIZE = 10

export default function KandidatenPage() {
  const { deals: DEALS, loading } = useDeals()
  const [search,   setSearch]   = useState('')
  const [ebene,    setEbene]    = useState<'all'|'off'|'on'>('all')
  const [scoreMin, setScoreMin] = useState(0)
  const [noKO,     setNoKO]     = useState(false)
  const [tabView,  setTabView]  = useState<'aktiv'|'archiv'|'sperrliste'>('aktiv')
  const [page,     setPage]     = useState(0)

  const filtered = DEALS
    .filter(d => tabView === 'aktiv' ? d.status !== 'rejected' : d.status === 'rejected')
    .filter(d => ebene === 'all' || (ebene === 'off' ? d.type === 'off-market' : d.type === 'on-market'))
    .filter(d => d.score >= scoreMin)
    .filter(d => !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.industry.toLowerCase().includes(search.toLowerCase()))
    .filter(d => !noKO || d.score >= 40)
    .sort((a, b) => b.score - a.score)

  const total = filtered.length
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="flex flex-col flex-1 overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex-none px-8 pt-7 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[26px] font-bold tracking-tight" style={{ color: 'var(--ink)' }}>Kandidaten</h1>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--muted)' }}>
              {DEALS.length} Firmen · {DEALS.filter(d=>d.type==='off-market').length} Ebene 1 · {DEALS.filter(d=>d.type==='on-market').length} Ebene 2
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px]" style={{ background: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--muted)' }}>
              <Download size={13} /> Export CSV
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white" style={{ background: 'var(--ink)' }}>
              <Plus size={13} /> Manuell erfassen
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-0 mt-5" style={{ borderBottom: '1px solid var(--line)' }}>
          {([['aktiv','Aktiv'],['archiv','Archiv'],['sperrliste','Sperrliste']] as const).map(([v,l]) => (
            <button key={v} onClick={() => { setTabView(v); setPage(0); }}
              className="px-4 py-2.5 text-[12.5px] font-medium"
              style={{ color: tabView === v ? 'var(--ink)' : 'var(--muted)', borderBottom: tabView === v ? '2px solid var(--ink)' : '2px solid transparent' }}>
              {l} · {v === 'aktiv' ? DEALS.filter(d=>d.status!=='rejected').length : v === 'archiv' ? DEALS.filter(d=>d.status==='rejected').length : 9}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex-none px-8 pb-3 flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Firma, UID, Branche…"
            className="pl-8 pr-3 py-1.5 rounded-lg text-[12px] outline-none"
            style={{ background: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--ink)', width: 200 }} />
        </div>
        <div className="flex items-center gap-1 p-0.5 rounded-lg" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
          {([['all','Alle'],['off','Ebene 1'],['on','Ebene 2']] as const).map(([v,l]) => (
            <button key={v} onClick={() => { setEbene(v); setPage(0); }}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium transition-all"
              style={{ background: ebene === v ? (v==='off'?'var(--l1-soft)':v==='on'?'var(--l2-soft)':'var(--bg)') : 'transparent', color: ebene === v ? (v==='off'?'var(--l1)':v==='on'?'var(--l2)':'var(--ink)') : 'var(--muted)' }}>
              {l}
            </button>
          ))}
        </div>
        <select value={scoreMin} onChange={e => { setScoreMin(+e.target.value); setPage(0); }}
          className="px-2.5 py-1.5 rounded-lg text-[11px] outline-none"
          style={{ background: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--muted)' }}>
          <option value={0}>Score ≥ 0</option>
          <option value={40}>Score ≥ 40</option>
          <option value={60}>Score ≥ 60</option>
          <option value={75}>Score ≥ 75</option>
        </select>
        <label className="flex items-center gap-2 text-[11.5px] cursor-pointer select-none" style={{ color: 'var(--muted)' }}>
          <div onClick={() => { setNoKO(!noKO); setPage(0); }}
            className="w-9 h-5 rounded-full flex items-center transition-colors cursor-pointer"
            style={{ background: noKO ? 'var(--l1)' : 'var(--line)', padding: '2px' }}>
            <div className="w-4 h-4 rounded-full bg-white transition-all" style={{ marginLeft: noKO ? 'auto' : '0' }} />
          </div>
          Ohne KO-Ausschluss
        </label>
        <span className="ml-auto text-[11px]" style={{ color: 'var(--muted)' }}>{total} Einträge</span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto mx-8 rounded-xl" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
        <table className="w-full border-collapse">
          <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg)' }}>
            <tr>
              {['FIRMA','EBENE','SIGNAL','KANTON','KO-GATES','STATUS','KONFIDENZ','SCORE ↑'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[9px] font-semibold tracking-wider uppercase whitespace-nowrap"
                  style={{ color: 'var(--muted)', borderBottom: '1px solid var(--line)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((deal, idx) => (
              <tr key={deal.id} className="hover:bg-slate-50 transition-colors cursor-pointer"
                style={{ borderBottom: '1px solid var(--line)' }}
                onClick={() => window.location.href = '/firma/' + deal.id}>
                <td className="px-4 py-2.5">
                  <div className="text-[12.5px] font-semibold" style={{ color: 'var(--ink)' }}>{deal.name}</div>
                  <div className="text-[10px] mt-0.5 font-mono" style={{ color: 'var(--muted)' }}>CHF-{Math.floor(Math.random()*900+100)}.{Math.floor(Math.random()*900+100)}.{Math.floor(Math.random()*900+100)}</div>
                </td>
                <td className="px-4 py-2.5"><EbenePill type={deal.type} /></td>
                <td className="px-4 py-2.5 text-[11px]" style={{ color: 'var(--muted)' }}>
                  {deal.type === 'off-market' ? 'SHAB · VR-Mutation' : (deal.listingPlatform ?? 'companymarket.ch')}
                </td>
                <td className="px-4 py-2.5 text-[12px] font-mono font-semibold" style={{ color: 'var(--ink)' }}>{deal.canton}</td>
                <td className="px-4 py-2.5"><GateDots sb={deal.scoreBreakdown} /></td>
                <td className="px-4 py-2.5">
                  <span className="text-[10px] font-medium" style={{ color: STATUS_MAP[deal.status]?.color ?? 'var(--muted)' }}>
                    {STATUS_MAP[deal.status]?.label ?? deal.status}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                    style={{ background: deal.confidence === 'A' ? '#D1FAE5' : deal.confidence === 'B' ? '#FEF3C7' : '#F3F4F6',
                             color: deal.confidence === 'A' ? '#059669' : deal.confidence === 'B' ? '#D97706' : '#6B7280' }}>
                    {deal.confidence} {deal.confidence === 'A' ? 'plausibel' : deal.confidence === 'B' ? 'angenähert' : 'grob'}
                  </span>
                </td>
                <td className="px-4 py-2.5"><ScoreBadge score={deal.score} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex-none px-8 py-3 flex items-center justify-between text-[11px]" style={{ color: 'var(--muted)' }}>
        <span>1-{Math.min((page+1)*PAGE_SIZE,total)} von {total}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setPage(p => Math.max(0,p-1))} disabled={page===0}
            className="px-2 py-1 rounded-md disabled:opacity-40" style={{ border: '1px solid var(--line)' }}>
            <ChevronLeft size={13} />
          </button>
          <button onClick={() => setPage(p => p+1)} disabled={(page+1)*PAGE_SIZE>=total}
            className="px-2 py-1 rounded-md disabled:opacity-40" style={{ border: '1px solid var(--line)' }}>
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}
