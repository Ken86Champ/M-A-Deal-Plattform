'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import type { Score } from '@shared/types'
import { scoreColor, fmtChf } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const NACHFOLGE_LABELS: Record<string, string> = {
  inhaberalter:    'Inhaberalter',
  kein_nachfolger: 'Kein Nachfolger bekannt',
  shab_ruecktritt: 'SHAB-Rücktritt',
  web_inaktiv:     'Website-Inaktivität',
  firmenalter:     'Firmenalter',
}

const INVEST_LABELS: Record<string, string> = {
  wiederkehr:              'Wiederkehrender Umsatz',
  kundendiversifikation:   'Kundendiversifikation',
  inhaber_unabhaengigkeit: 'Inhaber-Unabhängigkeit',
  groesse:                 'Unternehmensgrösse',
  ebitda_marge:            'EBITDA-Marge',
}

function WeightBar({ label, weight, value }: { label: string; weight: number; value?: number }) {
  const displayWeight = Math.round(weight * 100)
  const displayValue  = value != null ? Math.round(value) : null
  const color = displayValue != null ? scoreColor(displayValue) : 'var(--l2)'

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span style={{ color: 'var(--muted)' }}>{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-mono" style={{ color: 'var(--muted)' }}>{displayWeight}%</span>
          {displayValue != null && (
            <span className="font-mono font-semibold tabular-nums" style={{ color }}>{displayValue}</span>
          )}
        </div>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--line)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${displayWeight}%`,
            background: displayValue != null ? color : 'var(--l2)',
          }}
        />
      </div>
    </div>
  )
}

interface Props {
  score: Score | null
  companyName: string
  open: boolean
  onClose: () => void
  config?: {
    weights_nachfolge: Record<string, number>
    weights_invest: Record<string, number>
    thresholds: { ansprechen: number; beobachten: number }
  } | null
}

export function ScoreDrawer({ score, companyName, open, onClose, config }: Props) {
  const combined   = score?.combined ?? null
  const nachfolge  = score?.nachfolge ?? null
  const investierbar = score?.investierbar ?? null

  const wN = config?.weights_nachfolge ?? { inhaberalter: 0.35, kein_nachfolger: 0.25, shab_ruecktritt: 0.15, web_inaktiv: 0.10, firmenalter: 0.15 }
  const wI = config?.weights_invest    ?? { wiederkehr: 0.30, kundendiversifikation: 0.20, inhaber_unabhaengigkeit: 0.25, groesse: 0.10, ebitda_marge: 0.15 }
  const thr = config?.thresholds       ?? { ansprechen: 45, beobachten: 25 }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(25,27,24,0.3)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="fixed right-0 top-0 bottom-0 z-50 flex flex-col overflow-hidden shadow-2xl"
            style={{ width: 400, background: 'var(--panel)', borderLeft: '1px solid var(--line)' }}
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 flex-none" style={{ borderBottom: '1px solid var(--line)' }}>
              <div>
                <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--muted)' }}>Score-Details</p>
                <h2 className="text-[15px] font-semibold text-ink leading-tight mt-0.5 max-w-[300px] truncate">{companyName}</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}><X size={16} /></Button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Combined score */}
              <div className="rounded-xl p-5 text-center" style={{ background: 'var(--bg)' }}>
                <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: 'var(--muted)' }}>
                  Kombinierter Score
                </p>
                <p
                  className="font-mono font-black tabular-nums"
                  style={{ fontSize: 52, lineHeight: 1, color: scoreColor(combined) }}
                >
                  {combined != null ? combined.toFixed(1) : '–'}
                </p>
                <p className="text-[11px] mt-2" style={{ color: 'var(--muted)' }}>
                  Nachfolge × Investierbarkeit / 100
                </p>
                <div className="flex items-center justify-center gap-4 mt-3 text-[11px]">
                  <span style={{ color: 'var(--go)' }}>≥{thr.ansprechen} Ansprechen</span>
                  <span style={{ color: 'var(--grey)' }}>·</span>
                  <span style={{ color: 'var(--amber)' }}>≥{thr.beobachten} Beobachten</span>
                </div>
              </div>

              {/* Nachfolge */}
              <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--bg)' }}>
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-semibold text-ink">Nachfolge-Score</p>
                  <span className="font-mono font-bold text-[16px]" style={{ color: scoreColor(nachfolge) }}>
                    {nachfolge?.toFixed(1) ?? '–'}
                  </span>
                </div>
                <div className="space-y-2.5">
                  {Object.entries(NACHFOLGE_LABELS).map(([key, label]) => (
                    <WeightBar key={key} label={label} weight={wN[key] ?? 0} />
                  ))}
                </div>
              </div>

              {/* Investierbarkeit */}
              <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--bg)' }}>
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-semibold text-ink">Investierbarkeit</p>
                  <span className="font-mono font-bold text-[16px]" style={{ color: scoreColor(investierbar) }}>
                    {investierbar?.toFixed(1) ?? '–'}
                  </span>
                </div>
                <div className="space-y-2.5">
                  {Object.entries(INVEST_LABELS).map(([key, label]) => (
                    <WeightBar key={key} label={label} weight={wI[key] ?? 0} />
                  ))}
                </div>
              </div>

              {/* Konfidenz-Hinweis */}
              <p className="text-[10px] text-center px-2" style={{ color: 'var(--muted)' }}>
                Konfidenz A = amtlich · B = Drittschätzung · C = abgeleitet.
                Alle Zahlen sind Schätzungen bis zur NDA-Öffnung.
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
