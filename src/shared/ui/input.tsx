/**
 * Shared UI form field components (Input, Textarea, Select) with consistent border, focus ring, invalid, and disabled styles.
 *
 * Calls: cn
 * Used by:
 *   - shared/ui/index.ts
 */

import * as React from 'react'
import { cn } from '@/shared/lib/utils'

const fieldClasses =
  'w-full rounded-lg border border-border bg-surface text-sm text-foreground transition-colors duration-150 placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-bright/20 aria-invalid:border-danger aria-invalid:focus:ring-danger/20 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted disabled:opacity-70'

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

export function Select({ className, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      className={cn(fieldClasses, 'h-10 px-3', className)}
      {...props}
    />
  )
}
