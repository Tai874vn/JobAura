/**
 * Converts Next.js server search params into URLSearchParams and builds query strings for backend fetches.
 * Keeps filter handling on marketplace list pages consistent between server rendering and client requests.
 *
 * Calls: definedParams
 * Used by:
 *   - app/(marketplace)/hiring-posts/page.tsx
 *   - app/(marketplace)/jobs/page.tsx
 */

import { definedParams } from '@/shared/api/endpoints/params'

export type RawSearchParams = Record<string, string | string[] | undefined>

/**
 * Turns Next.js Server Component `searchParams` (a plain object where a key can hold one or
 * several values) into a standard URLSearchParams so server and client filter parsers agree.
 */
export function toUrlSearchParams(raw?: RawSearchParams | null): URLSearchParams {
  const params = new URLSearchParams()
  if (!raw) return params

  for (const [key, value] of Object.entries(raw)) {
    if (Array.isArray(value)) {
      const first = value.find((entry) => typeof entry === 'string')
      if (first !== undefined) params.set(key, first)
    } else if (typeof value === 'string') {
      params.set(key, value)
    }
  }

  return params
}

/**
 * Builds a query string (the `?a=1&b=2` part of a backend request) while dropping empty, null,
 * or undefined fields so server fetches match Axios's `definedParams` requests.
 */
export function toQueryString(params: Record<string, unknown>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(definedParams(params))) {
    search.set(key, String(value))
  }
  return search.toString()
}
