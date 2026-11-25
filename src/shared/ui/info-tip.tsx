'use client'

import { useEffect, useId, useLayoutEffect, useReducer, useRef, useState } from 'react'
import { Info } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { DialogPortal } from './dialog-portal'

export type TipState = { open: boolean; by: 'hover' | 'focus' | 'click' | null }
export type TipEvent = 'hoverIn' | 'hoverOut' | 'focus' | 'blur' | 'click' | 'escape' | 'outside'

export const closedTip: TipState = { open: false, by: null }

/**
 * How the tip opens and closes. A click or tap always leaves it open (it never toggles), so the mouseenter and
 * focus that come just before a click cannot make the click close it. Escape, a press outside, or focus leaving
 * the button closes it; the pointer leaving closes it only when the pointer opened it.
 */
export function tipReducer(state: TipState, event: TipEvent): TipState {
  switch (event) {
    case 'hoverIn': return state.open ? state : { open: true, by: 'hover' }
    case 'focus': return state.open ? state : { open: true, by: 'focus' }
    case 'click': return { open: true, by: 'click' }
    case 'hoverOut': return state.by === 'hover' ? closedTip : state
    case 'blur':
    case 'escape':
    case 'outside': return closedTip
  }
}

/** Keeps a portaled tooltip's horizontal center inside the viewport so it is never cut off at the edges. */
export function clampTipCenterX(centerX: number, viewportWidth: number, halfWidth = 112, margin = 12): number {
  const minX = Math.min(viewportWidth / 2, halfWidth + margin)
  const maxX = Math.max(minX, viewportWidth - halfWidth - margin)
  return Math.min(Math.max(centerX, minX), maxX)
}

type TipProps = { text: string; label: string; className?: string }
type TipCoords = { left: number; top: number }

/**
 * A small "i" button that shows a short explanation: on hover, on keyboard focus, and on click or tap. Escape, a
 * press outside, or moving focus away hides it. The text is also the button's title and is linked to it with
 * aria-describedby while shown. In the browser, the bubble portals to document.body so scrollable or overflow-hidden
 * cards never clip it.
 */
export function InfoTip(props: TipProps) {
  const [state, send] = useReducer(tipReducer, closedTip)
  const root = useRef<HTMLSpanElement>(null)
  const [portalCoords, setPortalCoords] = useState<TipCoords | null>(null)

  useLayoutEffect(() => {
    if (!state.open) return
    const measure = () => {
      const rect = root.current?.getBoundingClientRect()
      if (!rect) return
      const halfWidth = Math.min(112, window.innerWidth * 0.35)
      setPortalCoords({
        left: clampTipCenterX(rect.left + rect.width / 2, window.innerWidth, halfWidth),
        top: rect.top,
      })
    }
    measure()
    window.addEventListener('scroll', measure, true)
    window.addEventListener('resize', measure)
    return () => {
      window.removeEventListener('scroll', measure, true)
      window.removeEventListener('resize', measure)
    }
  }, [state.open])

  useEffect(() => {
    if (!state.open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) send('outside')
    }
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') send('escape') }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [state.open])

  return <InfoTipView {...props} rootRef={root} open={state.open} send={send} portalCoords={state.open ? portalCoords : null} />
}

/** The tip's markup for a given open state; InfoTip drives it with tipReducer. */
export function InfoTipView({
  text,
  label,
  className,
  open,
  send,
  rootRef,
  portalCoords,
}: TipProps & {
  open: boolean
  send: (event: TipEvent) => void
  rootRef?: React.Ref<HTMLSpanElement>
  portalCoords?: TipCoords | null
}) {
  const tipId = useId()
  // The outer wrapper holds the positioning transform (-translate-x-1/2), while the inner tooltip runs
  // `.motion-popover` so its translateY entrance never collides with horizontal centering.
  const tooltipBubble = (
    <span
      id={tipId}
      role="tooltip"
      className="motion-popover block w-56 max-w-[70vw] rounded-lg border border-border bg-surface px-2 py-1.5 text-xs leading-5 text-foreground shadow-lg"
    >
      {text}
    </span>
  )

  return (
    <span ref={rootRef} className={cn('relative inline-flex align-middle', className)}>
      <button type="button" aria-label={label} title={text} aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        className="rounded-full p-0.5 text-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-bright"
        onClick={() => send('click')} onFocus={() => send('focus')} onBlur={() => send('blur')}
        onMouseEnter={() => send('hoverIn')} onMouseLeave={() => send('hoverOut')}>
        <Info className="h-3.5 w-3.5" />
      </button>
      {open ? (
        portalCoords ? (
          <DialogPortal>
            <span
              className="pointer-events-none fixed z-80 -translate-x-1/2 -translate-y-full pb-1"
              style={{ left: portalCoords.left, top: portalCoords.top }}
            >
              {tooltipBubble}
            </span>
          </DialogPortal>
        ) : (
          <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1 -translate-x-1/2">
            {tooltipBubble}
          </span>
        )
      ) : null}
    </span>
  )
}
