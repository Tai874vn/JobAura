'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/shared/lib/utils'
import { Button } from './button'

/**
 * Discord-style save bar: slides up while there are unsaved changes, with Reset and Save. Leaving the page with
 * changes (a link to another page, or closing the tab) is held back: the bar shakes and turns red instead.
 * It sits centred above the page bottom, clear of the Chat button; pages give their content bottom padding.
 */
export function UnsavedChangesBar({
  dirty,
  saving = false,
  canSave = true,
  blockedReason,
  saveLabel = 'Save changes',
  onSave,
  onReset,
}: {
  dirty: boolean
  saving?: boolean
  /** False while something must be fixed first; `blockedReason` says what. */
  canSave?: boolean
  blockedReason?: string | null
  saveLabel?: string
  onSave: () => void
  onReset: () => void
}) {
  const pathname = usePathname()
  const [alarm, setAlarm] = useState(0)
  // Red while someone has just tried to leave; back to normal after a moment.
  const [warning, setWarning] = useState(false)
  const visible = dirty || saving

  useEffect(() => {
    if (!dirty) return
    const holdLinks = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const link = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return
      const url = new URL(link.href, window.location.href)
      // Same page (another Settings section keeps its draft) or another site: let it through.
      if (url.origin !== window.location.origin || url.pathname === pathname) return
      event.preventDefault()
      event.stopPropagation()
      setAlarm((count) => count + 1)
      setWarning(true)
    }
    const holdUnload = (event: BeforeUnloadEvent) => { event.preventDefault() }
    document.addEventListener('click', holdLinks, true)
    window.addEventListener('beforeunload', holdUnload)
    return () => {
      document.removeEventListener('click', holdLinks, true)
      window.removeEventListener('beforeunload', holdUnload)
    }
  }, [dirty, pathname])

  useEffect(() => {
    if (!alarm) return
    const timer = window.setTimeout(() => setWarning(false), 1600)
    return () => window.clearTimeout(timer)
  }, [alarm])

  return (
    <div aria-hidden={!visible} inert={!visible || undefined}
      className={cn(
        'pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4 transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none',
        // Above the Chat button on phones; level with it, centred and clear of it, on wider screens.
        'bottom-[84px] sm:bottom-5',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-32 opacity-0',
      )}>
      <div key={alarm} role="status" aria-live="polite"
        className={cn(
          'pointer-events-auto flex w-full max-w-xl flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border px-4 py-2.5 shadow-float',
          alarm ? 'animate-[unsaved-shake_0.45s_ease-in-out] motion-reduce:animate-none' : '',
          warning ? 'border-danger bg-danger text-white' : 'border-border bg-foreground text-surface',
        )}>
        <p className="min-w-0 flex-1 text-sm font-medium">
          {warning ? 'Save or reset your changes before leaving' : blockedReason && !canSave ? blockedReason : 'You have unsaved changes'}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" disabled={saving} onClick={onReset}
            className="rounded px-2 py-1 text-sm font-medium underline-offset-2 hover:underline disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-bright">
            Reset
          </button>
          <Button size="sm" loading={saving} disabled={!canSave || saving} onClick={onSave}
            className={warning ? 'bg-surface text-danger hover:bg-white/90' : undefined}>
            {saveLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
