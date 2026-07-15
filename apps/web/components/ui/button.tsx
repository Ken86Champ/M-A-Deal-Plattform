import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 active:scale-[0.97]',
  {
    variants: {
      variant: {
        default:   'bg-ink text-white hover:bg-ink/80',
        ghost:     'hover:bg-line text-ink',
        outline:   'border border-line bg-transparent hover:bg-line text-ink',
        l1:        'text-white hover:opacity-90',
        l2:        'text-white hover:opacity-90',
        destructive: 'bg-red text-white hover:opacity-90',
      },
      size: {
        default: 'h-8 px-3 gap-1.5 text-[13px]',
        sm:      'h-7 px-2.5 gap-1 text-xs',
        lg:      'h-10 px-4 gap-2 text-sm',
        icon:    'h-8 w-8',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, style, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    const bgStyle =
      variant === 'l1' ? { background: 'var(--l1)', ...style }
      : variant === 'l2' ? { background: 'var(--l2)', ...style }
      : style
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size, className }))} style={bgStyle} {...props} />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
