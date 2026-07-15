'use client'
import { scoreColor } from '@/lib/utils'

interface Props {
  score: number | null | undefined
  onClick?: () => void
  size?: 'sm' | 'md'
}

export function ScorePill({ score, onClick, size = 'md' }: Props) {
  const color = scoreColor(score)

  if (score == null) {
    return (
      <span
        className="font-mono text-[11px]"
        style={{ color: 'var(--grey)' }}
      >
        –
      </span>
    )
  }

  return (
    <button
      onClick={onClick}
      className="font-mono font-semibold tabular-nums leading-none rounded-sm px-1.5 py-0.5 hover:opacity-80 transition-opacity"
      style={{
        color,
        fontSize: size === 'md' ? '15px' : '12px',
        background: `${color}18`,
        border: `1px solid ${color}30`,
      }}
      title="Score-Details öffnen"
    >
      {score.toFixed(0)}
    </button>
  )
}
