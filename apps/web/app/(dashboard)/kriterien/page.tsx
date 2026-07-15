'use client'
import { useEffect, useState } from 'react'
import type { ConfigVersion, ConfigDiffItem, ConfigInterpretResponse } from '@shared/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ChevronRight, Check, AlertTriangle, Loader2 } from 'lucide-react'

// ── Helpers ────────────────────────────────────────────────────────────────────

function pct(n: number) { return `${Math.round(n * 100)}%` }

function fmt(v: unknown): string {
  if (v == null) return '–'
  if (typeof v === 'number') {
    return v < 1 ? pct(v) : String(v)
  }
  return String(v)
}

// ── Weight group display ───────────────────────────────────────────────────────

const NACHFOLGE_LABELS: Record<string, string> = {
  inhaberalter:    'Inhaberalter',
  kein_nachfolger: 'Kein Nachfolger',
  shab_ruecktritt: 'SHAB-Rücktritt',
  web_inaktiv:     'Website-Inaktivität',
  firmenalter:     'Firmenalter',
}
const INVEST_LABELS: Record<string, string> = {
  wiederkehr:              'Wiederkehrender Umsatz',
  kundendiversifikation:   'Kundendiversifikation',
  inhaber_unabhaengigkeit: 'Inhaber-Unabhängigkeit',
  groesse:                 'Grösse',
  ebitda_marge:            'EBITDA-Marge',
}

function WeightRow({ label, weight }: { label: string; weight: number }) {
  const w = Math.round(weight * 100)
  return (
    <div className="flex items-center gap-3">
      <span className="text-[12px] flex-1" style={{ color: 'var(--muted)' }}>{label}</span>
      <div className="flex items-center gap-2">
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ width: 80, background: 'var(--line)' }}
        >
          <div
            className="h-full rounded-full"
            style={{ width: `${w}%`, background: 'var(--l2)' }}
          />
        </div>
        <span className="font-mono text-[12px] w-8 text-right text-ink">{w}%</span>
      </div>
    </div>
  )
}

function ConfigPanel({ config }: { config: ConfigVersion }) {
  const p = config.payload
  return (
    <div className="space-y-4">
      {/* Meta */}
      <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--muted)' }}>
        <span>Version <strong className="text-ink font-mono">{config.version}</strong></span>
        <span>·</span>
        <span>{config.created_by === 'prompt' ? 'via Prompt' : 'manuell'}</span>
        <span>·</span>
        <span>{new Date(config.created_at).toLocaleDateString('de-CH')}</span>
        {config.active && (
          <span
            className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
            style={{ background: 'var(--l1-soft)', color: 'var(--l1)' }}
          >
            Aktiv
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Nachfolge weights */}
        <div
          className="rounded-xl p-4 space-y-2.5"
          style={{ background: 'var(--bg)' }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            Nachfolge-Gewichte
          </p>
          {Object.entries(NACHFOLGE_LABELS).map(([k, label]) => (
            <WeightRow key={k} label={label} weight={p.weights_nachfolge[k as keyof typeof p.weights_nachfolge] ?? 0} />
          ))}
        </div>

        {/* Invest weights */}
        <div
          className="rounded-xl p-4 space-y-2.5"
          style={{ background: 'var(--bg)' }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            Investierbarkeit-Gewichte
          </p>
          {Object.entries(INVEST_LABELS).map(([k, label]) => (
            <WeightRow key={k} label={label} weight={p.weights_invest[k as keyof typeof p.weights_invest] ?? 0} />
          ))}
        </div>
      </div>

      {/* Thresholds + Gates + Zielband */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--bg)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            Schwellen
          </p>
          <KV label="Ansprechen ab" value={`≥ ${p.thresholds.ansprechen}`} />
          <KV label="Beobachten ab"  value={`≥ ${p.thresholds.beobachten}`} />
        </div>

        <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--bg)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            KO-Gate-Parameter
          </p>
          <KV label="Klumpen-Max"      value={`${p.gates.klumpenrisiko_max_pct}%`} />
          <KV label="AI-Resilienz-Min" value={`Klasse ${p.gates.ai_resilienz_min_klasse}`} />
        </div>

        <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--bg)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            Zielband Umsatz
          </p>
          <KV label="Min" value={`CHF ${(p.groesse_zielband_chf.min / 1_000_000).toFixed(0)} Mio.`} />
          <KV label="Max" value={`CHF ${(p.groesse_zielband_chf.max / 1_000_000).toFixed(0)} Mio.`} />
          <KV label="EBITDA Multiple" value={`${p.ebitda_multiple.low}–${p.ebitda_multiple.high}x`} />
        </div>
      </div>
    </div>
  )
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px]" style={{ color: 'var(--muted)' }}>{label}</span>
      <span className="text-[12px] font-semibold font-mono text-ink">{value}</span>
    </div>
  )
}

// ── Diff table ─────────────────────────────────────────────────────────────────

function DiffTable({ items }: { items: ConfigDiffItem[] }) {
  if (!items.length) return (
    <p className="text-[12px] text-center py-4" style={{ color: 'var(--muted)' }}>
      Keine Änderungen
    </p>
  )

  return (
    <div className="divide-y overflow-hidden rounded-xl" style={{ borderColor: 'var(--line)', border: '1px solid var(--line)' }}>
      {items.map((item, i) => (
        <div key={i} className="grid px-4 py-2.5" style={{ gridTemplateColumns: '1fr 120px 120px', background: 'var(--panel)' }}>
          <span className="text-[12px] font-mono text-ink">{item.field}</span>
          <span className="text-[12px] font-mono text-right" style={{ color: 'var(--red)' }}>
            {fmt(item.from)}
          </span>
          <span className="text-[12px] font-mono text-right" style={{ color: 'var(--go)' }}>
            {fmt(item.to)}
          </span>
        </div>
      ))}
      {/* Header */}
      <style>{`
        .diff-header { grid-row: 1; }
      `}</style>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function KriterienPage() {
  const [config,  setConfig]  = useState<ConfigVersion | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const [prompt,       setPrompt]       = useState('')
  const [interpreting, setInterpreting] = useState(false)
  const [proposal,     setProposal]     = useState<ConfigInterpretResponse | null>(null)
  const [interpError,  setInterpError]  = useState<string | null>(null)

  const [saving,    setSaving]    = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved,     setSaved]     = useState(false)

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.ok ? r.json() : null)
      .then(setConfig)
      .finally(() => setLoading(false))
  }, [])

  async function interpret() {
    if (!prompt.trim() || !config) return
    setInterpreting(true)
    setInterpError(null)
    setProposal(null)
    setSaved(false)

    try {
      const res = await fetch('/api/config/interpret', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ prompt, currentConfig: config.payload }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Interpretations-Fehler')
      setProposal(data as ConfigInterpretResponse)
    } catch (e: any) {
      setInterpError(e.message)
    } finally {
      setInterpreting(false)
    }
  }

  async function apply() {
    if (!proposal) return
    setSaving(true)
    setSaveError(null)

    try {
      const res = await fetch('/api/config', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          payload:     proposal.new_config,
          prompt_text: prompt,
          created_by:  'prompt',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Speicherfehler')
      setConfig(data as ConfigVersion)
      setProposal(null)
      setPrompt('')
      setSaved(true)
      setTimeout(() => setSaved(false), 4000)
    } catch (e: any) {
      setSaveError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-[960px] mx-auto px-6 py-6 space-y-6">

      {/* Page title */}
      <div className="space-y-0.5">
        <h1 className="text-[20px] font-semibold text-ink">Kriterien & Tuning</h1>
        <p className="text-[13px]" style={{ color: 'var(--muted)' }}>
          Aktive Konfiguration · Prompt → Diff-Vorschau → Bestätigen → neue Version
        </p>
      </div>

      {/* Active config */}
      <section
        className="rounded-2xl p-5 space-y-4"
        style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
          Aktive Konfiguration
        </p>
        {loading ? (
          <div className="py-8 text-center text-[13px]" style={{ color: 'var(--muted)' }}>Laden…</div>
        ) : !config ? (
          <div
            className="rounded-xl px-4 py-3 text-[12px] flex items-center gap-2"
            style={{ background: '#FEF3C7', color: '#92400E' }}
          >
            <AlertTriangle size={14} />
            Keine aktive Config — bitte zuerst das DB-Seed ausführen (db/seed_config.sql).
          </div>
        ) : (
          <ConfigPanel config={config} />
        )}
      </section>

      {/* Prompt input */}
      {config && (
        <section
          className="rounded-2xl p-5 space-y-4"
          style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}
        >
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
              Anpassung per Prompt
            </p>
            <p className="text-[12px]" style={{ color: 'var(--muted)' }}>
              Beschreibe die gewünschte Änderung in natürlicher Sprache. Claude übersetzt sie in einen Config-Diff.
            </p>
          </div>

          <Textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder='Beispiel: "Erhöhe das Gewicht für Inhaberalter auf 45 % und senke Firmenalter auf 10 %."'
            rows={4}
            style={{ resize: 'vertical', minHeight: 100 }}
          />

          {interpError && (
            <div
              className="rounded-lg px-3 py-2 text-[12px] flex items-center gap-2"
              style={{ background: '#FEE2E2', color: 'var(--red)' }}
            >
              <AlertTriangle size={12} />
              {interpError}
            </div>
          )}

          <Button
            onClick={interpret}
            disabled={!prompt.trim() || interpreting}
            variant="default"
            className="flex items-center gap-2"
          >
            {interpreting && <Loader2 size={14} className="animate-spin" />}
            {interpreting ? 'Interpretiere …' : 'Interpretieren'}
            {!interpreting && <ChevronRight size={14} />}
          </Button>
        </section>
      )}

      {/* Proposal diff */}
      {proposal && (
        <section
          className="rounded-2xl p-5 space-y-4"
          style={{ background: 'var(--panel)', border: '1px solid var(--l1-line)' }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            Vorschlag — Diff
          </p>

          {/* LLM interpretation text */}
          <div
            className="rounded-xl p-4 text-[13px] leading-relaxed"
            style={{ background: 'var(--bg)', color: 'var(--ink)' }}
          >
            {proposal.interpretation}
          </div>

          {/* Diff table header */}
          <div
            className="grid text-[10px] uppercase tracking-widest font-semibold px-4 py-1.5 rounded-lg"
            style={{
              gridTemplateColumns: '1fr 120px 120px',
              background: 'var(--bg)',
              color: 'var(--muted)',
            }}
          >
            <span>Feld</span>
            <span className="text-right">Vorher</span>
            <span className="text-right">Nachher</span>
          </div>

          <DiffTable items={proposal.diff} />

          {saveError && (
            <div
              className="rounded-lg px-3 py-2 text-[12px] flex items-center gap-2"
              style={{ background: '#FEE2E2', color: 'var(--red)' }}
            >
              <AlertTriangle size={12} />
              {saveError}
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button
              onClick={apply}
              disabled={saving}
              variant="l1"
              className="flex items-center gap-2"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {saving ? 'Wird gespeichert …' : 'Übernehmen — neue Version aktivieren'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => { setProposal(null); setInterpError(null) }}
            >
              Verwerfen
            </Button>
          </div>
        </section>
      )}

      {/* Saved confirmation */}
      {saved && (
        <div
          className="rounded-xl px-4 py-3 text-[13px] flex items-center gap-2 font-medium"
          style={{ background: 'var(--l1-soft)', color: 'var(--l1)', border: '1px solid var(--l1-line)' }}
        >
          <Check size={16} />
          Neue Config-Version gespeichert und aktiviert.
        </div>
      )}
    </div>
  )
}
