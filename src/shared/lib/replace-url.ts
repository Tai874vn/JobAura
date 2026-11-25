/**
 * Change the address bar (filters, page number) WITHOUT a Next.js navigation.
 *
 * Why: list pages (/jobs, /hiring-posts, /my-hiring-posts, /candidates) already load their results on
 * the client with React Query, which keeps the old cards visible until the new ones arrive.
 * `router.replace()` also re-rendered the server page for the new search params, which showed the
 * route's loading skeleton and mounted the whole list again. The bot measured that as layout shift
 * (CLS 0.19–0.52 per filter change on /jobs).
 *
 * Next.js keeps `useSearchParams()` and `usePathname()` in sync with `window.history.replaceState`,
 * so components still re-read the new filters. Server rendering is still used for the first load
 * and for shared links, because those are real page loads.
 */
export function replaceUrlInPlace(href: string): void {
  if (typeof window === 'undefined') return
  window.history.replaceState(null, '', href)
}
