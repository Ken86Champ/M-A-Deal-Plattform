import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'flex h-8 w-full rounded-md border px-3 py-1 text-sm bg-panel text-ink placeholder:text-muted',
      'focus:outline-none focus:ring-2 focus:ring-l2 focus:ring-offset-0',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    style={{ borderColor: 'var(--line)' }}
    {...props}
  />
))
Input.displayName = 'Input'
export { Input }
