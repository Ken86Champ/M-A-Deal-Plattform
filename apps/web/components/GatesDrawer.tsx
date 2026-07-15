'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle2, AlertTriangle, XCircle, Circle } from 'lucide-react'
import type { Gate, GateKey } from '@shared/types'
import { gateColor, gatesOrdered, GATE_LABELS, GATE_ORDER } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const GATE_INFO: Record<GateKey, { definition: string; source: string; threshold: string }> = {
  inhaberabh: {
    definition: 'Umsatz hängt in hohem Mass an einer einzelnen Person (Inhaber/GF). Wechsel würde Kundenbasis oder Kompetenz gefährden.',
    source:     'Website-Analyse (Personenname im Firmennamen, Teamseite-Tiefe), LinkedIn',
    threshold:  'KO wenn: Personenname + Teamseite < 10% tief',
  },
  klumpen: {
    definition: 'Mehr als X% des Umsatzes kommen von einem einzigen Kunden oder Auftraggeber.',
    source:     'CRIF, Website-Referenzen, NDA-Unterlagen',
    threshold:  'KO wenn: Einzelkunde > 20% (konfigurierbar)',
  },
  ai_disrupt: {
    definition: 'Kernleistung der Firma ist durch AI-basierte Lösungen in <5 Jahren substituierbar.',
    source:     'AI-Resilienz-Klasse 1–5 (Claude-Prefilter): 1=substituierbar, 5=physisch+bewilligungspflichtig',
    threshold:  'KO wenn: Resilienz-Klasse < 3 (konfigurierbar)',
  },
  markt: {
    definition: 'Der adressierte Markt schrumpft strukturell (nicht zyklisch). Keine organische Wachstumsbasis für den Käufer.',
    source:     'Branchenberichte, LinkedIn-Marktdaten, Experteneinschätzung',
    threshold:  'KO wenn: strukturell schrumpfender Markt bestätigt',
  },
  bilanz: {
    definition: 'Bilanz-Red-Flags: überhöhte Forderungen, stille Lasten, Pensionskassen-Unterdeckung, versteckte Verbindlichkeiten.',
    source:     'Jahresabschluss nach NDA. Bis dahin offen.',
    threshold:  'KO wenn: Red-Flags nach NDA-Prüfung bestätigt',
  },
}

const StatusIcon = ({ status }: { status: string }) => {
  if (status === 'gruen') return <CheckCircle2 size={16} style={{ color: 'var(--go)' }} />
  if (status === 'gelb')  return <AlertTriangle size={16} style={{ color: 'var(--amber)' }} />
  if (status === 'rot')   return <XCircle size={16} style={{ color: 'var(--red)' }} />
  return <Circle size={16} style={{ color: 'var(--grey)' }} />
}

const STATUS_LABEL: Record<string, string> = {
  gruen: 'OK', gelb: 'Prüfen', rot: 'KO', offen: 'Offen',
}

interface Props {
  gates: Gate[]
  companyName: string
  open: boolean
  onClose: () => void
}

export function GatesDrawer({ gates, companyName, open, onClose }: Props) {
  const ordered = gatesOrdered(gates)

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
            style={{ width: 420, background: 'var(--panel)', borderLeft: '1px solid var(--line)' }}
            initial={{ x: 420 }}
            animate={{ x: 0 }}
            exit={{ x: 420 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 flex-none"
              style={{ borderBottom: '1px solid var(--line)' }}
            >
              <div>
                <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--muted)' }}>KO-Gates</p>
                <h2 className="text-[15px] font-semibold text-ink leading-tight mt-0.5 max-w-[320px] truncate">{companyName}</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}><X size={16} /></Button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {GATE_ORDER.map((key) => {
                const gate  = ordered.find(g => g.gate === key)
                const status = gate?.status ?? 'offen'
                const info   = GATE_INFO[key]
                const color  = gateColor(status)

                return (
                  <div
                    key={key}
                    className="rounded-xl p-4 space-y-2"
                    style={{ background: 'var(--bg)', border: `1.5px solid ${color}40` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <StatusIcon status={status} />
                        <span className="text-[13px] font-semibold text-ink">{GATE_LABELS[key]}</span>
                      </div>
                      <span
                        className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                        style={{ color, background: `${color}18` }}
                      >
                        {STATUS_LABEL[status]}
                      </span>
                    </div>

                    <p className="text-[12px] leading-relaxed" style={{ color: 'var(--muted)' }}>
                      {info.definition}
                    </p>

                    {gate?.begruendung && (
                      <p className="text-[12px] font-medium text-ink">
                        → {gate.begruendung}
                      </p>
                    )}

                    <div
                      className="rounded-lg px-3 py-2 space-y-1"
                      style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}
                    >
                      <p className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: 'var(--muted)' }}>Datenquelle</p>
                      <p className="text-[11px] text-ink">{info.source}</p>
                      <p className="text-[10px] uppercase tracking-wide font-semibold mt-2" style={{ color: 'var(--muted)' }}>Schwelle</p>
                      <p className="text-[11px] text-ink">{info.threshold}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
