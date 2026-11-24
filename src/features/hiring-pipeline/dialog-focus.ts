/**
 * Pure helpers for keeping the keyboard inside an open dialog (a "focus trap").
 * They work on plain lists, so they can be tested without a browser.
 */

/** CSS selector for the elements a keyboard user can reach with Tab. */
export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * Where Tab (or Shift+Tab) should go from position `current` in a list of `count` reachable elements.
 * It wraps from the last to the first and back. `current` is -1 when focus is outside the list.
 * Returns -1 when there is nothing to focus.
 */
export function nextFocusIndex(current: number, count: number, backwards: boolean): number {
  if (count <= 0) return -1
  if (current < 0) return backwards ? count - 1 : 0
  if (backwards) return current === 0 ? count - 1 : current - 1
  return current === count - 1 ? 0 : current + 1
}

export type FocusCandidate = { tagName: string; type?: string; cancel?: boolean }

/**
 * Which element gets focus when the dialog opens: the first form field (text box, choice, list),
 * otherwise the Cancel button (marked with `data-dialog-cancel`). Returns -1 when there is neither,
 * and the dialog box itself takes focus.
 */
export function initialFocusIndex(candidates: FocusCandidate[]): number {
  const field = candidates.findIndex((c) => {
    const tag = c.tagName.toUpperCase()
    if (tag === 'TEXTAREA' || tag === 'SELECT') return true
    return tag === 'INPUT' && c.type !== 'file' && c.type !== 'hidden'
  })
  if (field >= 0) return field
  return candidates.findIndex((c) => c.cancel === true)
}
