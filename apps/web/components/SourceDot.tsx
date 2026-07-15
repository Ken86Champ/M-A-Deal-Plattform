import type { Origination } from '@shared/types'

interface Props {
  origination: Origination | null
  size?: number
  showLabel?: boolean
}

export function SourceDot({ origination, size = 8, showLabel = false }: Props) {
  const color = origination === 'latent' ? 'var(--l1)' : origination === 'listed' ? 'var(--l2)' : 'var(--grey)'
  const label = origination === 'latent' ? 'Off-Market' : origination === 'listed' ? 'On-Market' : '–'

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block rounded-full flex-shrink-0"
        style={{ width: size, height: size, background: color }}
      />
      {showLabel && (
        <span className="text-[11px] font-medium" style={{ color }}>
          {label}
        </span>
      )}
    </span>
  )
}
