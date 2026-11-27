/**
 * Small helpers for JavaScript-driven motion such as programmatic scrolling.
 * Checks the browser's reduced-motion setting because CSS media queries do not override JS smooth scrolling.
 *
 * Calls: nothing from this project
 * Used by:
 *   - features/feed/components/post-discussion-modal.tsx
 *   - features/workspace/components/settings/settings-page.tsx
 */

/** Returns true when the browser reports that the user prefers reduced motion. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Returns `'auto'` when reduced motion is preferred, otherwise `'smooth'`. */
export function scrollBehavior(reduced = prefersReducedMotion()): ScrollBehavior {
  return reduced ? 'auto' : 'smooth'
}
