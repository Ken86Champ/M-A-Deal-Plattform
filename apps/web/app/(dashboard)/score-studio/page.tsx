'use client'
import { useState, useMemo } from 'react'
import { scoreColor, scoreBg } from '@/lib/mock-data'
import { useDeals } from '@/lib/use-deals'
import { Info, CheckCircle } from 'lucide-react'

interface Category {
  id: string
  label: string
  description: string
  color: string
  signals: string[]
  weight: number
}

const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'strategicFit',
    label: 'Strategic Fit',
    description: 'Passt das Unternehmen zu unserer Akquisitionsstrategie? Branche, Grösse, Geographie, Wachstumspotenzial.',
    color: '#3b82f6',
    weight: 30,
    signals: [
      'Umsatz CHF 1–10 Mio.',
      'Kanton CH (Deutschschweiz bevorzugt)',
      'Dienstleistung / Nischenfertigung',
      'Keine Cyclicals / keine reine Gastronomie',
      'Skalierbar oder Roll-up-fähig',
    ],
  },
  {
    id: 'companyQuality',
    label: 'Unternehmensqualität',
    description: 'Qualität des Geschäftsmodells: Margen, Kundenstabilität, Betriebskontinuität, Teamtiefe.',
    color: '#8b5cf6',
    weight: 25,
    signals: [
      'EBITDA-Marge >10%',
      'Wiederkehrender Umsatz >50%',
      'Kundenbindung >5 Jahre im Schnitt',
      'Keine Abhängigkeit von einzelnen Kunden >40%',
      'Nachfolgemanagement existiert (nicht Gründer-only)',
    ],
  },
  {
    id: 'salesProbability',
    label: 'Verkaufswahrscheinlichkeit',
    description: 'Wie wahrscheinlich ist ein Verkauf in den nächsten 12–24 Monaten? Succession-Signale, Motivation, Timing.',
    color: '#16a34a',
    weight: 20,
    signals: [
      'Inhaberalter >60',
      'SHAB-Rücktritts-Eintrag',
      'Personenname im Firmennamen',
      'Website seit >3 Jahren nicht aktualisiert',
      'Öffentlich inseriert (On-Market)',
    ],
  },
  {
    id: 'outreachPotential',
    label: 'Outreach-Potenzial',
    description: 'Wie gut lässt sich der Inhaber ansprechen? Erreichbarkeit, Kommunikationsstil, Netzwerk-Nähe.',
    color: '#f59e0b',
    weight: 15,
    signals: [
      'Direktkontakt via Website / Impressum',
      'LinkedIn-Profil vorhanden',
      'Persönlicher Brief naheliegend (Personenname)',
      'Öffentliches Inserat = explizite Kaufbereitschaft',
      'Regionalnetzwerk (Genossenschaft, Verein)',
    ],
  },
  {
    id: 'dataQuality',
    label: 'Datenqualität',
    description: 'Wie verlässlich sind die verfügbaren Daten? Konfidenz-Level der Schätzungen.',
    color: '#6b7280',
    weight: 10,
    signals: [
      'Amtliche Quellen (Zefix, Handelsregister)',
      'SHAB-Einträge verifiziert',
      'Website-Daten B-Qualität (scraped)',
      'Keine Finanzdaten — Konfidenz C',
      'Öffentliche Zahlen (Inserat) verifizierbar',
    ],
  },
]

function WeightSlider({
  category,
  value,
  onChange,
  isValid,
}: {
  category: Category
  value: number
  onChange: (v: number) => void
  isValid: boolean
}) {
  return (
    <div
      className="rounded-xl p-5 space-y-4"
      style={{ background: 'var(--panel)', border: `1px solid ${isValid ? 'var(--line)' : '#fca5a5'}` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full flex-none"
              style={{ background: category.color }}
            />
            <h3 className="text-[14px] font-semibold" style={{ color: 'var(--ink)' }}>
              {category.label}
            </h3>
          </div>
          <p className="text-[11px] mt-1 leading-relaxed" style={{ color: 'var(--muted)' }}>
            {category.description}
          </p>
        </div>
        <div className="flex-none text-right">
          <span
            className="text-[28px] font-bold tabular-nums font-mono"
            style={{ color: category.color }}
          >
            {value}%
          </span>
        </div>
      </div>

      {/* Slider */}
      <div className="space-y-1">
        <input
          type="range"
          min={0}
          max={60}
          step={5}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full accent-current h-1.5"
          style={{ accentColor: category.color }}
        />
        <div className="flex justify-between text-[9px]" style={{ color: 'var(--muted)' }}>
          <span>0%</span><span>60%</span>
        </div>
      </div>

      {/* Signal examples */}
      <div className="pt-1">
        <p className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: 'var(--muted)' }}>
          Beispiel-Signale
        </p>
        <ul className="space-y-1">
          {category.signals.map((s, i) => (
            <li key={i} className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--ink)' }}>
              <span className="w-1 h-1 rounded-full flex-none" style={{ background: category.color }} />
              {s}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default function ScoreStudioPage() {
  const { deals: DEALS } = useDeals()
  const [weights, setWeights] = useState<Record<string, number>>(
    Object.fromEntries(DEFAULT_CATEGORIES.map(c => [c.id, c.weight]))
  )
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  const total = Object.values(weights).reduce((s, v) => s + v, 0)
  const isValid = total === 100

  function setWeight(id: string, val: number) {
    setWeights(prev => ({ ...prev, [id]: val }))
  }

  async function saveWeights() {
    setSaving(true)
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weights, created_by: 'manual' }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      alert('Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  // Recompute preview scores for top 5 deals
  const previewScores = useMemo(() => {
    return DEALS.slice(0, 5).map((deal: any) => {
      const sb = deal.scoreBreakdown
      const categories: Record<string, number> = {
        strategicFit: sb.strategicFit,
        companyQuality: sb.companyQuality,
        salesProbability: sb.salesProbability,
        outreachPotential: sb.outreachPotential,
        dataQuality: sb.dataQuality,
      }
      const newScore = isValid
        ? Math.round(Object.entries(weights).reduce((s, [id, w]) => s + (categories[id] ?? 0) * (w / 100), 0))
        : deal.score
      return { deal, newScore }
    })
  }, [weights, isValid])

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-6 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[16px] font-semibold" style={{ color: 'var(--ink)' }}>
            Score Studio
          </h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--muted)' }}>
            Gewichtung der Scoring-Kategorien anpassen. Summe muss 100% ergeben.
          </p>
        </div>
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold"
          style={{
            background: isValid ? scoreBg(85) : '#fee2e2',
            color: isValid ? '#16a34a' : '#ef4444',
            border: `1px solid ${isValid ? '#bbf7d0' : '#fecaca'}`,
          }}
        >
          {total}% {!isValid && <span className="font-normal text-[11px]">(≠ 100%)</span>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Left: Weight sliders (2 cols) */}
        <div className="col-span-2 grid grid-cols-2 gap-3">
          {DEFAULT_CATEGORIES.map(cat => (
            <WeightSlider
              key={cat.id}
              category={cat}
              value={weights[cat.id] ?? 0}
              onChange={v => setWeight(cat.id, v)}
              isValid={isValid}
            />
          ))}
        </div>

        {/* Right: Preview */}
        <div className="space-y-3">
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}
          >
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--line)' }}>
              <div className="flex items-center gap-2">
                <Info size={12} style={{ color: 'var(--muted)' }} />
                <span className="text-[12px] font-semibold" style={{ color: 'var(--ink)' }}>
                  Live-Vorschau
                </span>
              </div>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>
                Wie ändern sich Scores mit neuer Gewichtung?
              </p>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--line)' }}>
              {previewScores.map(({ deal, newScore }) => {
                const delta = newScore - deal.score
                return (
                  <div key={deal.id} className="px-4 py-2.5 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium truncate" style={{ color: 'var(--ink)' }}>
                        {deal.name.split(' ').slice(0, 2).join(' ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[13px] font-bold tabular-nums font-mono"
                        style={{ color: scoreColor(newScore) }}
                      >
                        {newScore}
                      </span>
                      {delta !== 0 && (
                        <span
                          className="text-[10px] font-semibold"
                          style={{ color: delta > 0 ? '#16a34a' : '#ef4444' }}
                        >
                          {delta > 0 ? '+' : ''}{delta}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Weight summary */}
          <div
            className="rounded-xl p-4 space-y-2"
            style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}
          >
            <p className="text-[11px] font-semibold" style={{ color: 'var(--ink)' }}>
              Gewichts-Übersicht
            </p>
            {DEFAULT_CATEGORIES.map(cat => (
              <div key={cat.id} className="flex items-center gap-2">
                <span
                  className="w-1.5 h-1.5 rounded-full flex-none"
                  style={{ background: cat.color }}
                />
                <span className="text-[11px] flex-1" style={{ color: 'var(--muted)' }}>
                  {cat.label}
                </span>
                <span className="text-[11px] font-bold tabular-nums font-mono"
                  style={{ color: cat.color }}>
                  {weights[cat.id]}%
                </span>
              </div>
            ))}
            <div className="pt-1 border-t flex justify-between" style={{ borderColor: 'var(--line)' }}>
              <span className="text-[11px] font-semibold" style={{ color: 'var(--ink)' }}>
                Total
              </span>
              <span
                className="text-[11px] font-bold tabular-nums font-mono"
                style={{ color: isValid ? '#16a34a' : '#ef4444' }}
              >
                {total}%
              </span>
            </div>
          </div>

          {isValid && (
            <button
              className="w-full py-2.5 rounded-xl text-[13px] font-semibold transition-all active:scale-95 flex items-center justify-center gap-2"
              style={{ background: saved ? '#16a34a' : 'var(--ink)', color: 'var(--bg)' }}
              onClick={saveWeights}
              disabled={saving}
            >
              {saved
                ? <><CheckCircle size={13} /> Gespeichert</>
                : saving ? 'Speichert…' : 'Gewichtung speichern'
              }
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
