'use client'

import { useEffect, useId, useReducer, useRef } from 'react'
import { Info } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

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

type TipProps = { text: string; label: string; className?: string }

/**
 * A small "i" button that shows a short explanation: on hover, on keyboard focus, and on click or tap. Escape, a
 * press outside, or moving focus away hides it. The text is also the button's title and is linked to it with
 * aria-describedby while shown.
 */
export function InfoTip(props: TipProps) {
  const [state, send] = useReducer(tipReducer, closedTip)
  const root = useRef<HTMLSpanElement>(null)

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

  return <InfoTipView {...props} rootRef={root} open={state.open} send={send} />
}

/** The tip's markup for a given open state; InfoTip drives it with tipReducer. */
export function InfoTipView({
  text,
  label,
  className,
  open,
  send,
  rootRef,
}: TipProps & { open: boolean; send: (event: TipEvent) => void; rootRef?: React.Ref<HTMLSpanElement> }) {
  const tipId = useId()
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
        <span id={tipId} role="tooltip"
          className="absolute bottom-full left-1/2 z-30 mb-1 w-56 max-w-[70vw] -translate-x-1/2 rounded-lg border border-border bg-surface px-2 py-1.5 text-xs leading-5 text-foreground shadow-lg">
          {text}
        </span>
      ) : null}
    </span>
  )
}
