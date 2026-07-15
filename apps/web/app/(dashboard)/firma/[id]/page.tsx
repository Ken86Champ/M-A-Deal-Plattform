'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ExternalLink, AlertTriangle } from 'lucide-react'
import type { CompanyFull } from '@shared/types'
import { scoreColor, fmtChf, gateColor, gatesOrdered, GATE_LABELS, GATE_ORDER, sinceYears } from '@/lib/utils'
import { SourceDot } from '@/components/SourceDot'
import { ScorePill } from '@/components/ScorePill'
import { GateDots } from '@/components/GateDots'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { GatesDrawer } from '@/components/GatesDrawer'
import { ScoreDrawer } from '@/components/ScoreDrawer'

function KV({ label, value, mono }: { label: string; value?: string | number | null; mono?: boolean }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--muted)' }}>{label}</p>
      <p className={`text-[13px] ${mono ? 'font-mono' : ''} text-ink`}>{value ?? '–'}</p>
    </div>
  )
}

function ConfBadge({ conf }: { conf?: string | null }) {
  if (!conf) return null
  const color = conf === 'A' ? 'var(--go)' : conf === 'B' ? 'var(--amber)' : 'var(--grey)'
  return (
    <span className="text-[9px] font-bold ml-1 px-1 rounded" style={{ color, background: `${color}20` }}>
      {conf}
    </span>
  )
}

export default function FirmaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router  = useRouter()

  const [company,     setCompany]     = useState<CompanyFull | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)
  const [gatesOpen,   setGatesOpen]   = useState(false)
  const [scoreOpen,   setScoreOpen]   = useState(false)
  const [deciding,    setDeciding]    = useState(false)

  useEffect(() => {
    fetch(`/api/companies/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(setCompany)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [id])

  async function decide(kind: 'ansprechen' | 'spaeter' | 'weg', reason?: string) {
    if (!company) return
    setDeciding(true)
    await fetch('/api/decisions', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ company_id: company.id, kind, reason }),
    })
    setDeciding(false)
    router.push('/')
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-[13px]" style={{ color: 'var(--muted)' }}>
      Laden…
    </div>
  )
  if (error || !company) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center space-y-2">
        <AlertTriangle size={24} style={{ color: 'var(--red)', margin: '0 auto' }} />
        <p className="text-[13px]" style={{ color: 'var(--muted)' }}>Firma nicht gefunden</p>
        <Button variant="ghost" size="sm" onClick={() => router.back()}>Zurück</Button>
      </div>
    </div>
  )

  const e     = company.enrichment
  const score = company.latestScore
  const gates = company.gates
  const src   = company.sources[0]?.origination ?? null

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-5 space-y-5">

      {/* Back + header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-[12px] mt-1"
          style={{ color: 'var(--muted)' }}
        >
          <ArrowLeft size={14} />
          Zurück
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <SourceDot origination={src} size={10} showLabel />
            <h1 className="text-[22px] font-bold text-ink leading-tight">{company.name}</h1>
            <Badge variant={company.status as any}>{company.status}</Badge>
          </div>
          {company.purpose && (
            <p className="text-[13px] mt-1 max-w-[700px]" style={{ color: 'var(--muted)' }}>
              {company.purpose}
            </p>
          )}
        </div>

        {/* Score + gates */}
        <div className="flex items-center gap-3 flex-none">
          <GateDots gates={gates} onClick={() => setGatesOpen(true)} />
          <ScorePill score={score?.combined} onClick={() => setScoreOpen(true)} size="md" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">

        {/* Col 1: Stammdaten */}
        <div
          className="rounded-2xl p-4 space-y-4"
          style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}
        >
          <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--muted)' }}>
            Stammdaten
          </p>
          <div className="grid grid-cols-2 gap-3">
            <KV label="Kanton"      value={company.canton} />
            <KV label="Rechtsform"  value={company.legal_form} />
            <KV label="Gegründet"   value={company.founded_year ? `${company.founded_year} (${sinceYears(company.founded_year)})` : null} />
            <KV label="UID"         value={company.uid} mono />
          </div>

          {company.sources.length > 0 && (
            <div className="space-y-1.5 pt-1" style={{ borderTop: '1px solid var(--line)' }}>
              <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--muted)' }}>
                Quellen
              </p>
              {company.sources.map(s => (
                <div key={s.id} className="flex items-center gap-2 text-[11px]">
                  <SourceDot origination={s.origination} size={7} />
                  <span className="text-ink">{s.source_name}</span>
                  {s.first_seen && (
                    <span style={{ color: 'var(--muted)' }}>
                      · {new Date(s.first_seen).toLocaleDateString('de-CH')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Col 2: Enrichment */}
        <div
          className="rounded-2xl p-4 space-y-4"
          style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}
        >
          <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--muted)' }}>
            Enrichment
          </p>

          {!e ? (
            <p className="text-[12px]" style={{ color: 'var(--muted)' }}>Noch nicht angereichert</p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--muted)' }}>
                    Inhaber/GF
                  </p>
                  <p className="text-[13px] text-ink">
                    {e.inhaber_name ?? '–'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--muted)' }}>
                    Alter (Schätzung)
                  </p>
                  <p className="text-[13px] font-mono text-ink">
                    {e.inhaber_alter ?? '–'}
                    <ConfBadge conf={e.inhaber_alter_conf} />
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--muted)' }}>
                    Umsatz (Est.)
                  </p>
                  <p className="text-[13px] font-mono text-ink">
                    {fmtChf(e.umsatz_est_chf)}
                    <ConfBadge conf={e.umsatz_conf} />
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--muted)' }}>
                    Mitarbeiter (Est.)
                  </p>
                  <p className="text-[13px] font-mono text-ink">{e.mitarbeiter_est ?? '–'}</p>
                </div>
              </div>

              {/* Signal indicators */}
              <div className="space-y-1.5 pt-2" style={{ borderTop: '1px solid var(--line)' }}>
                <SignalRow label="Kein Nachfolger"       val={e.kein_nachfolger}       conf={e.kein_nachfolger_conf} />
                <SignalRow label="SHAB-Rücktritt"        val={e.shab_ruecktritt} />
                <SignalRow label="Personenname im Namen" val={e.personenname_in_name} />
                <BarRow    label="Teamseite-Tiefe"       val={e.team_seite_tiefe} />
                <BarRow    label="Wiederkehr-Signal"     val={e.wiederkehr_signal} />
                <BarRow    label="Kundendiversifikation" val={e.kundendiversifikation} />
              </div>

              <p className="text-[10px] pt-1" style={{ color: 'var(--muted)', borderTop: '1px solid var(--line)' }}>
                Vor NDA sind alle Zahlen Schätzungen. Konfidenz A/B/C.
              </p>
            </div>
          )}
        </div>

        {/* Col 3: Scores + Decision */}
        <div className="space-y-4">
          {/* Score card */}
          <div
            className="rounded-2xl p-4 space-y-3"
            style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}
          >
            <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--muted)' }}>
              Score
            </p>
            {score ? (
              <div className="flex items-end gap-4">
                <div className="text-center">
                  <p className="text-[10px]" style={{ color: 'var(--muted)' }}>Combined</p>
                  <p className="font-mono font-black text-[36px] leading-none" style={{ color: scoreColor(score.combined) }}>
                    {score.combined.toFixed(1)}
                  </p>
                </div>
                <div className="flex-1 space-y-1.5">
                  <MiniScore label="Nachfolge"      val={score.nachfolge} />
                  <MiniScore label="Investierbar"   val={score.investierbar} />
                </div>
              </div>
            ) : (
              <p className="text-[12px]" style={{ color: 'var(--muted)' }}>Noch nicht bewertet</p>
            )}
            <button
              className="text-[11px] underline"
              style={{ color: 'var(--l2)' }}
              onClick={() => setScoreOpen(true)}
            >
              Score-Details →
            </button>
          </div>

          {/* Decision buttons */}
          <div
            className="rounded-2xl p-4 space-y-3"
            style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}
          >
            <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--muted)' }}>
              Entscheidung
            </p>
            {company.latestDecision ? (
              <div className="text-[12px] text-ink">
                <span className="font-semibold capitalize">{company.latestDecision.kind}</span>
                <span style={{ color: 'var(--muted)' }}>
                  {' '}· {new Date(company.latestDecision.decided_at).toLocaleDateString('de-CH')}
                </span>
                {company.latestDecision.reason && (
                  <p className="mt-1" style={{ color: 'var(--muted)' }}>{company.latestDecision.reason}</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Button
                  variant="l1"
                  className="w-full justify-start"
                  disabled={deciding}
                  onClick={() => decide('ansprechen')}
                >
                  Ansprechen → Brief-Queue
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  disabled={deciding}
                  onClick={() => decide('spaeter')}
                >
                  Später beobachten
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-[12px]"
                  style={{ color: 'var(--muted)' }}
                  disabled={deciding}
                  onClick={() => decide('weg')}
                >
                  Verwerfen
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drawers */}
      <GatesDrawer
        open={gatesOpen}
        gates={gates}
        companyName={company.name}
        onClose={() => setGatesOpen(false)}
      />
      <ScoreDrawer
        open={scoreOpen}
        score={score}
        companyName={company.name}
        onClose={() => setScoreOpen(false)}
      />
    </div>
  )
}

// ── Micro components ───────────────────────────────────────────────────────────

function SignalRow({ label, val, conf }: { label: string; val?: boolean | null; conf?: string | null }) {
  const color = val === true ? 'var(--go)' : val === false ? 'var(--grey)' : 'var(--muted)'
  const icon  = val === true ? '●' : val === false ? '○' : '–'
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <span style={{ color }}>
        {icon}
        {conf && <ConfBadge conf={conf} />}
      </span>
    </div>
  )
}

function BarRow({ label, val }: { label: string; val?: number | null }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="flex-1" style={{ color: 'var(--muted)' }}>{label}</span>
      <div className="h-1.5 rounded-full overflow-hidden w-20" style={{ background: 'var(--line)' }}>
        {val != null && (
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.round(val * 100)}%`, background: 'var(--l2)' }}
          />
        )}
      </div>
      <span className="font-mono w-8 text-right text-ink">
        {val != null ? `${Math.round(val * 100)}%` : '–'}
      </span>
    </div>
  )
}

function MiniScore({ label, val }: { label: string; val: number }) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <span className="font-mono font-semibold" style={{ color: scoreColor(val) }}>{val.toFixed(1)}</span>
    </div>
  )
}
