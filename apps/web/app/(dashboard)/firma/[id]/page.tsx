'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronRight, AlertTriangle, Send, Check, ExternalLink } from 'lucide-react'
import type { CompanyFull } from '@shared/types'
import { scoreColor, fmtChf, gateColor, sinceYears } from '@/lib/utils'
import { SourceDot } from '@/components/SourceDot'
import { Button } from '@/components/ui/button'

type Tab = 'dossier' | 'brief' | 'verlauf'

const GATE_NAMES: Record<string, string> = {
  inhaberabh: 'Inhaberabhängigkeit',
  klumpen:    'Kundenklampen',
  ai_disrupt: 'AI-Disruption',
  markt:      'Marktattraktivität',
  bilanz:     'Bilanzqualität',
}
const GATE_ORDER = ['inhaberabh','klumpen','ai_disrupt','markt','bilanz']

const GATE_NOTE: Record<string, string> = {
  inhaberabh: '2. Führungsebene vorhanden',
  klumpen:    'Top-Kunde <25 % (Schätzung B)',
  ai_disrupt: '2/5 – gering',
  markt:      'Nachschlüssig, stabil',
  bilanz:     'EK-Quote >40 % (Schätzung B)',
}

function ScoreGauge({ score }: { score: number }) {
  const size = 110, r = 42
  const circ = 2 * Math.PI * r
  const pct  = Math.min(score / 100, 1)
  const col  = score >= 60 ? '#10B981' : score >= 45 ? '#F59E0B' : '#9CA3AF'
  return (
    <div className="relative flex items-center justify-center flex-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E5E7EB" strokeWidth={7} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={7}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 0.9s ease', filter: `drop-shadow(0 0 4px ${col}88)` }}
        />
      </svg>
      <div className="text-center z-10">
        <div className="text-[28px] font-black font-mono leading-none" style={{ color: col }}>{score.toFixed(0)}</div>
        <div className="text-[9px] font-bold tracking-wider uppercase mt-0.5" style={{ color: '#9CA3AF' }}>Score</div>
      </div>
    </div>
  )
}

function BarRow({ label, value, note }: { label: string; value: number; note?: string }) {
  const col = value >= 60 ? '#10B981' : value >= 45 ? '#F59E0B' : '#9CA3AF'
  return (
    <div className="flex items-center gap-3">
      <span className="text-[12px] w-24 flex-none" style={{ color: 'var(--ink)' }}>{label}</span>
      <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: '#E5E7EB' }}>
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: col, transition: 'width 0.7s ease' }} />
      </div>
      <span className="text-[12px] font-bold font-mono w-8 text-right" style={{ color: col }}>{value}</span>
      {note && <span className="text-[10px] w-36" style={{ color: 'var(--muted)' }}>{note}</span>}
    </div>
  )
}

export default function FirmaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }     = use(params)
  const router     = useRouter()
  const [tab, setTab]       = useState<Tab>('dossier')
  const [company, setCompany] = useState<CompanyFull | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)
  const [deciding, setDeciding] = useState(false)

  useEffect(() => {
    fetch(`/api/companies/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(setCompany)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [id])

  async function decide(kind: 'ansprechen' | 'spaeter' | 'weg') {
    if (!company) return
    setDeciding(true)
    await fetch('/api/decisions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ company_id: company.id, kind }) })
    setDeciding(false)
    router.push('/kandidaten')
  }

  if (loading) return <div className="flex items-center justify-center flex-1 text-[13px]" style={{ color: 'var(--muted)' }}>Laden…</div>
  if (error || !company) return (
    <div className="flex items-center justify-center flex-1">
      <div className="text-center space-y-2">
        <AlertTriangle size={24} style={{ color: '#EF4444', margin: '0 auto' }} />
        <p className="text-[13px]" style={{ color: 'var(--muted)' }}>Firma nicht gefunden</p>
        <button onClick={() => router.back()} className="text-[12px] underline" style={{ color: 'var(--l2)' }}>Zurück</button>
      </div>
    </div>
  )

  const e     = company.enrichment
  const score = company.latestScore
  const gates = company.gates
  const src   = company.sources[0]?.origination ?? null
  const orderedGates = GATE_ORDER.map(k => gates.find((g: any) => g.gate === k)).filter(Boolean)
  const isOff = src === 'latent'

  return (
    <div className="flex flex-col flex-1 overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Breadcrumb */}
      <div className="flex-none px-8 pt-5 pb-0 flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--muted)' }}>
        <button onClick={() => router.push('/kandidaten')} className="hover:opacity-70 transition-opacity">Kandidaten</button>
        <ChevronRight size={10} />
        <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{company.name}</span>
      </div>

      {/* Header */}
      <div className="flex-none px-8 pt-3 pb-4 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-[24px] font-bold tracking-tight" style={{ color: 'var(--ink)' }}>{company.name}</h1>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
              style={{ background: isOff ? 'var(--l1-soft)' : 'var(--l2-soft)', color: isOff ? 'var(--l1)' : 'var(--l2)' }}>
              {isOff ? 'Ebene 1 - Off Market' : 'Ebene 2 - On Market'}
            </span>
            {score && (
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-[12px] font-bold"
                style={{ background: score.combined >= 60 ? '#D1FAE5' : '#FEF3C7', color: score.combined >= 60 ? '#059669' : '#D97706' }}>
                {score.combined.toFixed(0)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-[11.5px]" style={{ color: 'var(--muted)' }}>
            {company.uid && <span className="font-mono">{company.uid}</span>}
            {company.branche && <><span>·</span><span>{company.branche}</span></>}
            {company.canton && <><span>·</span><span>{company.canton}</span></>}
            {company.founded_year && <><span>·</span><span>Gegr. {company.founded_year}</span></>}
            {e?.mitarbeiter_est && <><span>·</span><span>~{e.mitarbeiter_est} MA</span></>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-none">
          <button className="px-3 py-1.5 rounded-lg text-[12px]" style={{ background: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--muted)' }}>
            Neu bewertet
          </button>
          <button
            disabled={deciding}
            onClick={() => decide('ansprechen')}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-semibold text-white disabled:opacity-60"
            style={{ background: 'var(--l1)' }}>
            <Send size={13} /> Brief in Queue →
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto px-8 pb-6 min-h-0">
        <div className="grid grid-cols-2 gap-5 mb-5">
          {/* Left: Score + Gates */}
          <div className="rounded-xl p-5" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
            <div className="text-[10px] font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--muted)' }}>Bewertungskern</div>
            {score ? (
              <div className="flex items-start gap-5">
                <ScoreGauge score={score.combined} />
                <div className="flex-1 space-y-2.5">
                  <BarRow label="Nachfolge" value={score.nachfolge} />
                  <BarRow label="Investierbarkeit" value={score.investierbar} />
                  <div className="text-[10px] pt-1" style={{ color: 'var(--muted)' }}>
                    {score.nachfolge.toFixed(0)} × {score.investierbar.toFixed(0)} / 100 = {score.combined.toFixed(0)}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-[12px]" style={{ color: 'var(--muted)' }}>Noch nicht bewertet</p>
            )}

            <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
              <div className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: orderedGates.every((g: any) => g.status === 'gruen') ? '#059669' : 'var(--muted)' }}>
                KO-Gates {orderedGates.every((g: any) => g.status === 'gruen') ? '· Alle bestanden' : ''}
              </div>
              <div className="space-y-2">
                {orderedGates.length ? orderedGates.map((g: any) => (
                  <div key={g.gate} className="flex items-start gap-2.5">
                    <Check size={13} className="flex-none mt-0.5" style={{ color: gateColor(g.status) }} />
                    <div>
                      <span className="text-[12px] font-medium" style={{ color: 'var(--ink)' }}>{GATE_NAMES[g.gate]}</span>
                      <span className="text-[10px] ml-2" style={{ color: 'var(--muted)' }}>{g.begruendung ?? GATE_NOTE[g.gate] ?? '–'}</span>
                    </div>
                  </div>
                )) : <p className="text-[11px]" style={{ color: 'var(--muted)' }}>Keine Gates bewertet</p>}
              </div>
            </div>
          </div>

          {/* Right: Signals + Financials */}
          <div className="space-y-4">
            <div className="rounded-xl p-5" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
              <div className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--muted)' }}>Nachfolge-Signale</div>
              {e ? (
                <div className="space-y-3">
                  {e.shab_ruecktritt && (
                    <div className="flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full flex-none mt-1.5" style={{ background: '#10B981' }} />
                      <div>
                        <div className="text-[12px] font-medium" style={{ color: 'var(--ink)' }}>SHAB-Mutation Verwaltungsrat</div>
                        <div className="text-[10px]" style={{ color: 'var(--muted)' }}>Austritt Gründer · Quelle →</div>
                      </div>
                    </div>
                  )}
                  {e.inhaber_alter && (
                    <div className="flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full flex-none mt-1.5" style={{ background: '#10B981' }} />
                      <div>
                        <div className="text-[12px] font-medium" style={{ color: 'var(--ink)' }}>Inhaber ~{e.inhaber_alter} Jahre</div>
                        <div className="text-[10px]" style={{ color: 'var(--muted)' }}>Zefix / Handelsregister-Abgleich</div>
                      </div>
                    </div>
                  )}
                  {e.kein_nachfolger && (
                    <div className="flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full flex-none mt-1.5" style={{ background: '#10B981' }} />
                      <div>
                        <div className="text-[12px] font-medium" style={{ color: 'var(--ink)' }}>Keine Nachfolge auf Website erwähnt</div>
                        <div className="text-[10px]" style={{ color: 'var(--muted)' }}>Enrichment-Scan · {new Date(e.enriched_at).toLocaleDateString('de-CH')}</div>
                      </div>
                    </div>
                  )}
                  {!e.shab_ruecktritt && !e.inhaber_alter && !e.kein_nachfolger && (
                    <p className="text-[11px]" style={{ color: 'var(--muted)' }}>Keine Signale erkannt</p>
                  )}
                </div>
              ) : <p className="text-[11px]" style={{ color: 'var(--muted)' }}>Noch nicht angereichert</p>}
            </div>

            <div className="rounded-xl p-5" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Kennzahlen (vor NDA)</div>
                <button className="text-[10px] font-semibold px-2 py-0.5 rounded" style={{ background: 'var(--l2-soft)', color: 'var(--l2)' }}>Schätzungen</button>
              </div>
              {e ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Umsatz ca.</div>
                    <div className="text-[14px] font-bold mt-0.5" style={{ color: 'var(--ink)' }}>{fmtChf(e.umsatz_est_chf)}</div>
                    <div className="text-[9px]" style={{ color: 'var(--muted)' }}>Konf. {e.umsatz_conf ?? 'B'}</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>EBITDA-Marge</div>
                    <div className="text-[14px] font-bold mt-0.5" style={{ color: 'var(--ink)' }}>{e.ebitda_marge_est ? `${Math.round(e.ebitda_marge_est * 100)}%` : '–'}</div>
                    <div className="text-[9px]" style={{ color: 'var(--muted)' }}>Konf. C</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Mitarbeitende</div>
                    <div className="text-[14px] font-bold mt-0.5" style={{ color: 'var(--ink)' }}>~{e.mitarbeiter_est ?? '–'}</div>
                    <div className="text-[9px]" style={{ color: 'var(--muted)' }}>Konf. A</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Immobilien</div>
                    <div className="text-[14px] font-bold mt-0.5" style={{ color: 'var(--ink)' }}>Im Eigentum</div>
                    <div className="text-[9px]" style={{ color: 'var(--muted)' }}>Konf. A</div>
                  </div>
                </div>
              ) : <p className="text-[11px]" style={{ color: 'var(--muted)' }}>Noch nicht angereichert</p>}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
          <div className="flex items-center justify-between" style={{ borderBottom: '1px solid var(--line)' }}>
            <div className="flex items-center gap-0">
              {([['dossier','Teil 1 – Internes Dossier'],['brief','Teil 2 – Brief an Inhaber'],['verlauf','Verlauf & Audit']] as const).map(([v,l]) => (
                <button key={v} onClick={() => setTab(v)}
                  className="px-5 py-3 text-[12px] font-medium transition-colors"
                  style={{ color: tab === v ? 'var(--ink)' : 'var(--muted)', borderBottom: tab === v ? '2px solid var(--ink)' : '2px solid transparent' }}>
                  {l}
                </button>
              ))}
            </div>
            <span className="px-4 text-[10px]" style={{ color: '#EF4444' }}>Verlässt niemals das System</span>
          </div>
          <div className="p-5 text-[12.5px] leading-relaxed" style={{ color: 'var(--ink)' }}>
            {tab === 'dossier' && (
              <div>
                {company.purpose ? (
                  <>
                    <p><strong>Einschätzung.</strong> {company.purpose}</p>
                    {e && e.kein_nachfolger && <p className="mt-2"><strong>Schwächen:</strong> Vertrieb hängt am Inhaber; keine ERP-Integration erkennbar; dünne 2. Ebene im Vertrieb.</p>}
                  </>
                ) : (
                  <p style={{ color: 'var(--muted)' }}>Noch kein Dossier erstellt. Nach dem nächsten Pipeline-Lauf automatisch generiert.</p>
                )}
              </div>
            )}
            {tab === 'brief' && (
              <p style={{ color: 'var(--muted)' }}>Briefentwurf wird automatisch nach «Brief in Queue» generiert und kann im Approval-Queue bearbeitet werden.</p>
            )}
            {tab === 'verlauf' && (
              <div className="space-y-3">
                {[
                  { date: company.created_at, event: 'Erfasst', desc: 'Firma in Pipeline aufgenommen' },
                  ...(e ? [{ date: e.enriched_at, event: 'Angereichert', desc: 'Website-Enrichment abgeschlossen' }] : []),
                  ...(score ? [{ date: score.computed_at, event: 'Bewertet', desc: `Score ${score.combined.toFixed(1)}` }] : []),
                  ...(company.latestDecision ? [{ date: company.latestDecision.decided_at, event: 'Entschieden', desc: company.latestDecision.kind }] : []),
                ].reverse().map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-[10px] font-mono w-20 flex-none mt-0.5" style={{ color: 'var(--muted)' }}>{new Date(item.date).toLocaleDateString('de-CH')}</span>
                    <span className="text-[12px] font-semibold w-24 flex-none" style={{ color: 'var(--ink)' }}>{item.event}</span>
                    <span className="text-[12px]" style={{ color: 'var(--muted)' }}>{item.desc}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
