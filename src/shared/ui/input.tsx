import * as React from 'react'
import { cn } from '@/shared/lib/utils'

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-foreground transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary-bright/20',
        className
      )}
      {...props}
    />
  )
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'min-h-28 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary-bright/20',
        className
      )}
      {...props}
    />
  )
}
