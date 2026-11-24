'use client'

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { FOCUSABLE_SELECTOR, initialFocusIndex, nextFocusIndex } from './dialog-focus'

const subscribe = () => () => undefined

/**
 * Draws a dialog at the end of `document.body` (a "portal"), so it is not trapped inside the phone detail view's
 * layer and always sits above the sticky header and the Chat button. The server draws nothing; the browser
 * draws the dialog once the page is ready.
 */
export function DialogPortal({ children }: { children: ReactNode }) {
  const inBrowser = useSyncExternalStore(subscribe, () => true, () => false)
  return inBrowser ? createPortal(children, document.body) : null
}

/** The elements inside `box` that Tab can reach right now (enabled and drawn on screen). */
function reachable(box: HTMLElement): HTMLElement[] {
  return Array.from(box.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => el.getClientRects().length > 0)
}

/**
 * Keyboard care for a modal dialog. Put the returned ref on the `role="dialog"` box.
 * - On open, focus moves to the first form field, else the Cancel button (`data-dialog-cancel`), else the box.
 * - Tab and Shift+Tab stay inside the box (a "focus trap").
 * - Escape calls `onClose`, unless `canClose` is false (a step is still being sent).
 * - On close, focus goes back to the element that opened the dialog.
 *
 * The ref is a "callback ref" (React calls it with the element once it is on the page), so it also works
 * when the portal draws the box one render later.
 */
export function useDialogFocus<T extends HTMLElement = HTMLElement>(onClose: () => void, canClose = true) {
  const [box, setBox] = useState<T | null>(null)
  // The latest values live in a ref, so the open/close effect below runs only once per dialog.
  const latest = useRef({ onClose, canClose })
  useEffect(() => {
    latest.current = { onClose, canClose }
  }, [onClose, canClose])

  useEffect(() => {
    if (!box) return
    const opener = document.activeElement instanceof HTMLElement && !box.contains(document.activeElement) ? document.activeElement : null

    const items = reachable(box)
    const start = initialFocusIndex(
      items.map((el) => ({ tagName: el.tagName, type: el.getAttribute('type') ?? undefined, cancel: el.hasAttribute('data-dialog-cancel') })),
    )
    if (start >= 0) items[start].focus()
    else {
      if (!box.hasAttribute('tabindex')) box.setAttribute('tabindex', '-1')
      box.focus()
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (latest.current.canClose) {
          event.preventDefault()
          latest.current.onClose()
        }
        return
      }
      if (event.key !== 'Tab') return
      const list = reachable(box)
      const next = nextFocusIndex(list.indexOf(document.activeElement as HTMLElement), list.length, event.shiftKey)
      event.preventDefault()
      if (next >= 0) list[next].focus()
      else box.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      if (opener?.isConnected) opener.focus()
    }
  }, [box])

  return setBox
}
