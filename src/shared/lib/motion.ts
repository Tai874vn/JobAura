/**
 * Small helpers for JavaScript-driven motion (like programmatic `scrollIntoView`),
 * because CSS `@media (prefers-reduced-motion: reduce)` does not override JS `{ behavior: 'smooth' }`.
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
