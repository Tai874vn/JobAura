import * as React from 'react'
import { cn } from '@/shared/lib/utils'

const fieldClasses =
  'w-full rounded-lg border border-border bg-surface text-sm text-foreground transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary-bright/20'

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(fieldClasses, 'h-10 px-3', className)}
      {...props}
    />
  )
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(fieldClasses, 'min-h-28 px-3 py-2', className)}
      {...props}
    />
  )
}
