import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
  {
    variants: {
      variant: {
        default:   'bg-line text-muted',
        qualified: 'text-white',
        bewertet:  'bg-line text-muted',
        neu:       'bg-line text-muted',
        latent:    'text-white',
        listed:    'text-white',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, style, ...props }: BadgeProps) {
  const bgStyle =
    variant === 'qualified' ? { background: 'var(--go)', ...style }
    : variant === 'latent'  ? { background: 'var(--l1)', ...style }
    : variant === 'listed'  ? { background: 'var(--l2)', ...style }
    : style
  return <span className={cn(badgeVariants({ variant, className }))} style={bgStyle} {...props} />
}
