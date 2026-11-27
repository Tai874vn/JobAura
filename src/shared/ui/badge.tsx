/**
 * Shared UI badge pill for short status labels and tags in neutral, primary, accent, rating, or danger tones.
 *
 * Calls: cn
 * Used by:
 *   - shared/ui/index.ts
 */

import * as React from 'react'
import { cn } from '@/shared/lib/utils'

const tones = {
  neutral: 'bg-surface-muted text-foreground',
  primary: 'bg-primary/10 text-primary',
  accent: 'bg-surface-muted text-foreground',
  rating: 'bg-rating/15 text-rating-ink',
  danger: 'bg-danger/10 text-danger',
}

export function Badge({
  className,
  tone = 'neutral',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) {
  return (
    <span
      className={cn('inline-flex items-center rounded-md px-2 py-1 text-xs font-medium', tones[tone], className)}
      {...props}
    />
  )
}
