'use client'

import { useSyncExternalStore, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

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
