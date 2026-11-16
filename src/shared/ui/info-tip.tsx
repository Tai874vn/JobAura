'use client'

import { useId, useState } from 'react'
import { Info } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

/**
 * A small "i" button that shows a short explanation: on hover, on keyboard focus, and on tap (tap again or Escape
 * hides it). The text is also the button's title and is linked to it with aria-describedby while shown.
 */
export function InfoTip({ text, label, className }: { text: string; label: string; className?: string }) {
  const [open, setOpen] = useState(false)
  const tipId = useId()
  return (
    <span className={cn('relative inline-flex align-middle', className)}>
      <button type="button" aria-label={label} title={text} aria-expanded={open} aria-describedby={open ? tipId : undefined}
        className="rounded-full p-0.5 text-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-bright"
        onClick={() => setOpen((shown) => !shown)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
        onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}
        onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false) }}>
        <Info className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <span id={tipId} role="tooltip"
          className="absolute bottom-full left-1/2 z-30 mb-1 w-56 max-w-[70vw] -translate-x-1/2 rounded-lg border border-border bg-surface px-2 py-1.5 text-xs leading-5 text-foreground shadow-lg">
          {text}
        </span>
      ) : null}
    </span>
  )
}
