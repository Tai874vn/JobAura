/**
 * Reads, checks, and clears the `csrf_token` cookie used for CSRF headers on write requests and as the browser session marker.
 *
 * Calls: nothing from this project
 * Used by:
 *   - features/auth/hooks/use-session.ts
 *   - features/jobs/utils/refresh-job-pages.ts
 *   - proxy.ts
 *   - shared/api/client.ts
 */

export const SESSION_COOKIE_NAME = 'csrf_token'

const UNSAFE_METHODS = new Set(['post', 'put', 'patch', 'delete'])

export function csrfTokenFromCookie(cookieHeader: string): string | undefined {
  const prefix = `${SESSION_COOKIE_NAME}=`
  const value = cookieHeader
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(prefix))
    ?.slice(prefix.length)
  if (!value) return undefined

  try {
    return decodeURIComponent(value)
  } catch {
    return undefined
  }
}

export function hasCsrfTokenCookie(cookieHeader?: string): boolean {
  if (typeof cookieHeader === 'string') return Boolean(csrfTokenFromCookie(cookieHeader))
  if (typeof document === 'undefined') return false
  return Boolean(csrfTokenFromCookie(document.cookie))
}

export function csrfTokenForMethod(method?: string): string | undefined {
  if (typeof document === 'undefined' || !method || !UNSAFE_METHODS.has(method.toLowerCase())) return undefined
  return csrfTokenFromCookie(document.cookie)
}

/**
 * Clears the client-readable session marker cookie in the browser so a dead session
 * cannot bounce in a loop between a private page and /auth/login in src/proxy.ts.
 */
export function clearCsrfTokenCookie() {
  if (typeof document === 'undefined') return
  document.cookie = `${SESSION_COOKIE_NAME}=; Max-Age=0; path=/; SameSite=Lax`
}
