'use client'
import type { Gate } from '@shared/types'
import { gateColor, gatesOrdered, GATE_LABELS } from '@/lib/utils'

interface Props {
  gates: Gate[]
  onClick?: () => void
}

export function GateDots({ gates, onClick }: Props) {
  const ordered = gatesOrdered(gates)
  const hasRed  = ordered.some(g => g.status === 'rot')

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 group"
      title="Gates öffnen"
    >
      {ordered.length === 0
        ? Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className="inline-block rounded-full"
              style={{ width: 8, height: 8, background: 'var(--grey)' }}
            />
          ))
        : ordered.map((g) => (
            <span
              key={g.gate}
              className="inline-block rounded-full transition-transform group-hover:scale-110"
              style={{ width: 8, height: 8, background: gateColor(g.status) }}
              title={`${GATE_LABELS[g.gate as keyof typeof GATE_LABELS]}: ${g.status}`}
            />
          ))}
      {hasRed && (
        <span className="ml-1 text-[9px] font-bold uppercase" style={{ color: 'var(--red)' }}>KO</span>
      )}
    </button>
  )
}
