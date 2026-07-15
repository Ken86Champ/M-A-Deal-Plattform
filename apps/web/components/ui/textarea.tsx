import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm bg-panel text-ink placeholder:text-muted resize-none',
      'focus:outline-none focus:ring-2 focus:ring-l2 focus:ring-offset-0',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    style={{ borderColor: 'var(--line)' }}
    {...props}
  />
))
Textarea.displayName = 'Textarea'
export { Textarea }
