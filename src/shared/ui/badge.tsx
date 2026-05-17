import * as React from 'react'
import { cn } from '@/shared/lib/utils'

const tones = {
  neutral: 'bg-surface-muted text-foreground',
  primary: 'bg-primary-fixed bg-primary/10 text-primary',
  accent: 'bg-accent/30 text-foreground',
  rating: 'bg-rating/15 text-[#5c4300]',
  danger: 'bg-danger/10 text-danger',
}

export function Badge({
  className,
  tone = 'neutral',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) {
  return (
    <span
      className={cn('inline-flex items-center rounded px-2 py-1 text-xs font-semibold', tones[tone], className)}
      {...props}
    />
  )
}
