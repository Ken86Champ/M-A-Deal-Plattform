'use client'
import Link from 'next/link'
import { topDeals, scoreColor, scoreBg, type Deal } from '@/lib/mock-data'
import { useDeals } from '@/lib/use-deals'
import { ArrowRight, TrendingUp, Building2, BarChart3, Clock } from 'lucide-react'

function ScoreBadge({ score }: { score: number }) {
  return (
    <span
      className="inline-flex items-center justify-center w-10 h-8 rounded-lg text-[13px] font-bold tabular-nums font-mono"
      style={{ background: scoreBg(score), color: scoreColor(score) }}
    >
      {score}
    </span>
  )
}

function TypePill({ type }: { type: Deal['type'] }) {
  const isOff = type === 'off-market'
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold"
      style={{
        background: isOff ? 'color-mix(in srgb, var(--l1) 15%, transparent)' : 'color-mix(in srgb, var(--l2) 15%, transparent)',
        color:      isOff ? 'var(--l1)' : 'var(--l2)',
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: isOff ? 'var(--l1)' : 'var(--l2)' }} />
      {isOff ? 'Off-Market' : 'On-Market'}
    </span>
  )
}

export default function DashboardPage() {
  const { deals: DEALS, loading, source } = useDeals()
  const qualified = DEALS.filter(d => d.score >= 60)
  const offMarket = DEALS.filter(d => d.type === 'off-market')
  const onMarket  = DEALS.filter(d => d.type === 'on-market')
  const newDeals  = DEALS.filter(d => d.status === 'new')
  const avgScore  = Math.round(qualified.reduce((s, d) => s + d.score, 0) / (qualified.length || 1))
  const top       = [...DEALS].sort((a, b) => b.score - a.score).slice(0, 6)

  const STATS = [
    { label: 'Qualifiziert',    value: qualified.length,  icon: <TrendingUp size={14} />,  color: 'var(--go)' },
    { label: 'Off-Market',      value: offMarket.length,  icon: <Building2 size={14} />,   color: 'var(--l1)' },
    { label: 'On-Market',       value: onMarket.length,   icon: <BarChart3 size={14} />,   color: 'var(--l2)' },
    { label: 'Neu heute',       value: newDeals.length,   icon: <Clock size={14} />,       color: 'var(--amber)' },
    { label: 'Ø Score',         value: avgScore,          icon: null,                       color: scoreColor(avgScore), mono: true },
  ]

  if (loading) return (
    <div className="flex items-center justify-center h-64" style={{ color: 'var(--muted)' }}>
      <span className="text-[13px]">Lade Deals…</span>
    </div>
  )

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-8 space-y-8">

      {/* Greeting */}
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight" style={{ color: 'var(--ink)' }}>
          Guten Morgen.
        </h1>
        <div className="flex items-center gap-3">
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--muted)' }}>
            {newDeals.length} neue qualifizierte Deals — {qualified.length} aktiv in der Pipeline.
          </p>
          {source === 'mock' && (
            <span className="text-[10px] px-2 py-0.5 rounded font-semibold"
              style={{ background: '#fef3c7', color: '#d97706' }}>
              Demo-Daten
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        {STATS.map(s => (
          <div
            key={s.label}
            className="rounded-xl px-4 py-4"
            style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}
          >
            <div className="flex items-center gap-1.5 mb-2" style={{ color: s.color }}>
              {s.icon}
              <span className="text-[11px] font-medium" style={{ color: 'var(--muted)' }}>
                {s.label}
              </span>
            </div>
            <span
              className={`text-[28px] font-bold tabular-nums ${s.mono ? 'font-mono' : ''}`}
              style={{ color: s.color }}
            >
              {s.value}
            </span>
          </div>
        ))}
      </div>

      {/* Top Deals */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}
      >
        <div
          className="flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>
            Top Deals
          </span>
          <Link
            href="/inbox"
            className="flex items-center gap-1 text-[12px] font-medium transition-opacity hover:opacity-70"
            style={{ color: 'var(--l2)' }}
          >
            Alle anzeigen <ArrowRight size={12} />
          </Link>
        </div>

        <div className="divide-y" style={{ borderColor: 'var(--line)' }}>
          {top.map(deal => (
            <Link
              key={deal.id}
              href={`/inbox?deal=${deal.id}`}
              className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-[var(--bg)]"
              style={{ display: 'flex' }}
            >
              <ScoreBadge score={deal.score} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold truncate" style={{ color: 'var(--ink)' }}>
                    {deal.name}
                  </span>
                  <TypePill type={deal.type} />
                </div>
                <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--muted)' }}>
                  {deal.dealReason}
                </p>
              </div>

              <div className="flex items-center gap-4 flex-none">
                <span className="text-[12px] font-mono" style={{ color: 'var(--muted)' }}>
                  {deal.canton}
                </span>
                <span className="text-[11px] truncate max-w-[120px]" style={{ color: 'var(--muted)' }}>
                  {deal.industry}
                </span>
                <ArrowRight size={14} style={{ color: 'var(--muted)' }} />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick-access cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            href: '/inbox?type=off-market',
            color: 'var(--l1)',
            label: 'Off-Market Pipeline',
            sub: `${offMarket.length} Firmen identifiziert`,
            desc: 'Latente Targets aus Zefix & SHAB — noch nicht öffentlich zum Verkauf',
          },
          {
            href: '/inbox?type=on-market',
            color: 'var(--l2)',
            label: 'On-Market Inserate',
            sub: `${onMarket.length} Plattform-Listings`,
            desc: 'Aggregiert von companymarket.ch und firmenboerse.com',
          },
          {
            href: '/deals',
            color: 'var(--ink)',
            label: 'Deal Pipeline',
            sub: `${DEALS.filter(d => !['rejected','won'].includes(d.pipelineStage)).length} aktive Deals`,
            desc: 'Von "Neu qualifiziert" bis "Verhandlung" im Überblick',
          },
        ].map(card => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-xl px-5 py-4 block group transition-all hover:shadow-sm"
            style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-semibold" style={{ color: card.color }}>
                {card.label}
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-md"
                style={{ background: 'var(--bg)', color: 'var(--muted)' }}>
                {card.sub}
              </span>
            </div>
            <p className="text-[12px] leading-relaxed" style={{ color: 'var(--muted)' }}>
              {card.desc}
            </p>
            <div className="flex items-center gap-1 mt-3 text-[11px] font-medium" style={{ color: card.color }}>
              Öffnen <ArrowRight size={11} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
