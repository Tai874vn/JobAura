'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/shared/lib/utils'
import { Button } from './button'

/** Intercepts in-app link clicks whenever there are unsaved changes, even inside a hidden Settings tab. */
export function shouldHoldNavigation(dirty: boolean): boolean {
  return dirty
}

export type NavigationHoldDecision = {
  block: boolean
  revealTab: boolean
}

/**
 * Decides whether clicking an in-app link must be blocked to prevent silently discarding unsaved edits.
 * Same-page navigation (switching Settings sections) stays allowed; leaving the page from a hidden dirty
 * tab still blocks navigation and signals the host to switch back to the dirty tab so the warning shows.
 */
export function decideNavigationHold({
  dirty,
  active,
  targetPathname,
  currentPathname,
  sameOrigin,
}: {
  dirty: boolean
  active: boolean
  targetPathname: string
  currentPathname: string
  sameOrigin: boolean
}): NavigationHoldDecision {
  if (!dirty || !sameOrigin || targetPathname === currentPathname) {
    return { block: false, revealTab: false }
  }
  return { block: true, revealTab: !active }
}

/**
 * Discord-style save bar: slides up while there are unsaved changes, with Reset and Save. Leaving the page with
 * changes (a link to another page, or closing the tab) is held back: the bar shakes and turns red instead.
 * It sits centred above the page bottom, clear of the Chat button; pages give their content bottom padding.
 */
export function UnsavedChangesBar({
  dirty,
  active = true,
  saving = false,
  canSave = true,
  blockedReason,
  saveLabel = 'Save changes',
  onSave,
  onReset,
  onBlockedNavigation,
}: {
  dirty: boolean
  /** False when this form lives inside a hidden tab; the bar stays hidden until navigation is blocked or the tab is opened. */
  active?: boolean
  saving?: boolean
  /** False while something must be fixed first; `blockedReason` says what. */
  canSave?: boolean
  blockedReason?: string | null
  saveLabel?: string
  onSave: () => void
  onReset: () => void
  /** Called when navigation is blocked while `active` is false so the host can reveal this tab before shaking the bar. */
  onBlockedNavigation?: () => void
}) {
  const pathname = usePathname()
  const [shaking, setShaking] = useState(false)
  // Red while someone has just tried to leave; back to normal after a moment.
  const [warning, setWarning] = useState(false)
  const warningTimerRef = useRef<number | null>(null)
  const shakeFrameRef = useRef<number | null>(null)
  const activeRef = useRef(active)
  const onBlockedRef = useRef(onBlockedNavigation)
  const visible = active && (dirty || saving)

  useEffect(() => {
    activeRef.current = active
    onBlockedRef.current = onBlockedNavigation
  }, [active, onBlockedNavigation])

  useEffect(() => {
    if (!dirty) return
    const holdUnload = (event: BeforeUnloadEvent) => { event.preventDefault() }
    window.addEventListener('beforeunload', holdUnload)
    return () => window.removeEventListener('beforeunload', holdUnload)
  }, [dirty])

  useEffect(() => {
    if (!shouldHoldNavigation(dirty)) return
    const holdLinks = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const link = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return
      const url = new URL(link.href, window.location.href)
      const decision = decideNavigationHold({
        dirty,
        active: activeRef.current,
        targetPathname: url.pathname,
        currentPathname: pathname,
        sameOrigin: url.origin === window.location.origin,
      })
      if (!decision.block) return
      event.preventDefault()
      event.stopPropagation()
      if (decision.revealTab) onBlockedRef.current?.()
      setWarning(true)
      if (warningTimerRef.current !== null) window.clearTimeout(warningTimerRef.current)
      warningTimerRef.current = window.setTimeout(() => {
        setWarning(false)
        warningTimerRef.current = null
      }, 1600)
      // Toggle the shake class instead of changing a React key, so Save/Reset keep their DOM nodes and focus.
      setShaking(false)
      if (shakeFrameRef.current !== null) window.cancelAnimationFrame(shakeFrameRef.current)
      shakeFrameRef.current = window.requestAnimationFrame(() => {
        setShaking(true)
        shakeFrameRef.current = null
      })
    }
    document.addEventListener('click', holdLinks, true)
    return () => document.removeEventListener('click', holdLinks, true)
  }, [dirty, pathname])

  useEffect(() => {
    return () => {
      if (warningTimerRef.current !== null) window.clearTimeout(warningTimerRef.current)
      if (shakeFrameRef.current !== null) window.cancelAnimationFrame(shakeFrameRef.current)
    }
  }, [])

  return (
    <div aria-hidden={!visible} inert={!visible || undefined}
      className={cn(
        'pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4 transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none',
        // Above the Chat button on phones; level with it, centred and clear of it, on wider screens.
        'bottom-[84px] sm:bottom-5',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-32 opacity-0',
      )}>
      <div
        role="status"
        aria-live="polite"
        onAnimationEnd={() => setShaking(false)}
        className={cn(
          'pointer-events-auto flex w-full max-w-xl flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border px-4 py-2.5 shadow-float',
          shaking ? 'animate-[unsaved-shake_0.45s_ease-in-out] motion-reduce:animate-none' : '',
          warning ? 'border-danger bg-danger text-white' : 'border-border bg-foreground text-surface',
        )}
      >
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
