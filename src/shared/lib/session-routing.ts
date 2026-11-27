/**
 * Auth routing and redirect safety helpers for login flows, session expiry, and the request proxy.
 * Checks internal return paths, lists protected route prefixes, computes login redirects, and saves Google OAuth return paths.
 *
 * Calls: nothing from this project
 * Used by:
 *   - 9 files, for example features/auth/components/auth-forms.tsx, features/auth/components/oauth-callback.tsx, features/auth/components/require-auth.tsx
 */

const INTERNAL_NAVIGATION_ORIGIN = 'https://jobaura.invalid'
const OAUTH_NEXT_STORAGE_KEY = 'jobaura:oauth-next'
const CONTROL_CHARS_RE = /[\u0000-\u001f\u007f]/

// Routes that should never be used as a post-login ?next= destination, because
// returning to them creates a redirect loop, logs the user right back out, or hits an API route.
function isDisallowedRedirectPath(pathname: string) {
  const lower = pathname.toLowerCase()
  return (
    lower === '/auth' ||
    lower.startsWith('/auth/') ||
    lower === '/logout' ||
    lower.startsWith('/logout/') ||
    lower === '/api' ||
    lower.startsWith('/api/')
  )
}

function hasUnsafePathChars(value: string) {
  return (
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.startsWith('/\\') ||
    value.includes('\\') ||
    CONTROL_CHARS_RE.test(value)
  )
}

export function safeInternalPath(value: string | null | undefined): string | null {
  if (typeof value !== 'string' || CONTROL_CHARS_RE.test(value)) return null
  const raw = value.trim()
  if (!raw || hasUnsafePathChars(raw)) return null

  let decoded: string
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    return null
  }
  if (hasUnsafePathChars(decoded)) return null

  try {
    const url = new URL(raw, INTERNAL_NAVIGATION_ORIGIN)
    const decodedUrl = new URL(decoded, INTERNAL_NAVIGATION_ORIGIN)
    if (url.origin !== INTERNAL_NAVIGATION_ORIGIN || decodedUrl.origin !== INTERNAL_NAVIGATION_ORIGIN) {
      return null
    }
    if (isDisallowedRedirectPath(url.pathname) || isDisallowedRedirectPath(decodedUrl.pathname)) {
      return null
    }
    const result = `${url.pathname}${url.search}${url.hash}`
    if (
      !result.startsWith('/') ||
      result.startsWith('//') ||
      result.startsWith('/\\') ||
      decodedUrl.pathname.startsWith('//') ||
      decodedUrl.pathname.startsWith('/\\')
    ) {
      return null
    }
    return result
  } catch {
    return null
  }
}

export function buildLoginRedirect(pathname: string, search = '') {
  const normalizedSearch = search && !search.startsWith('?') ? `?${search}` : search
  const next = safeInternalPath(`${pathname}${normalizedSearch}`)
  return next ? `/auth/login?next=${encodeURIComponent(next)}` : '/auth/login'
}

export function getSessionExpiredRedirect(pathname: string, search = '') {
  if (pathname === '/') return '/welcome'

  const isPublic =
    pathname === '/welcome' ||
    pathname === '/jobs' ||
    pathname === '/hiring-posts' ||
    /^\/hiring-posts\/\d+$/.test(pathname) ||
    /^\/jobs\/\d+$/.test(pathname) ||
    /^\/profile\/\d+$/.test(pathname) ||
    pathname.startsWith('/auth/') ||
    pathname === '/logout'

  return isPublic ? null : buildLoginRedirect(pathname, search)
}

/** Pages that need a sign-in. The proxy sends visitors to the login page, and robots.txt keeps crawlers out. */
export const PROTECTED_PREFIXES = [
  '/admin',
  '/contracts',
  '/my-applications',
  '/my-hiring-posts',
  '/my-posts',
  '/my-jobs',
  '/saved',
  '/connections',
  '/settings',
  '/wallet',
  '/recommendations',
  '/candidates',
  '/jobs/new',
] as const

export function isProtectedProxyPath(pathname: string) {
  if (PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return true
  }
  return /^\/jobs\/[^/]+\/edit(?:\/|$)/.test(pathname) || /^\/interviews\/[^/]+\/call(?:\/|$)/.test(pathname)
}

/**
 * Pure redirect decision for src/proxy.ts (Next.js request proxy, previously called middleware).
 * Only redirects anonymous visitors (no session cookie) off `/` and protected routes.
 * Never bounces cookie holders off /auth/login or /auth/register because a stale csrf_token
 * cookie cannot prove a live session; AuthPageGate handles that redirect after /api/auth/me succeeds.
 */
export function resolveProxyRedirect({
  pathname,
  search = '',
  hasSessionCookie,
}: {
  pathname: string
  search?: string
  hasSessionCookie: boolean
}): string | null {
  if (hasSessionCookie) return null
  if (pathname === '/') return '/welcome'
  if (isProtectedProxyPath(pathname)) return buildLoginRedirect(pathname, search)
  return null
}

/** Saves a safe return path in sessionStorage (same-tab browser storage) before leaving for Google OAuth. */
export function storeOAuthNextPath(nextPath: string | null | undefined) {
  if (typeof window === 'undefined') return
  const safe = safeInternalPath(nextPath)
  try {
    if (safe) window.sessionStorage.setItem(OAUTH_NEXT_STORAGE_KEY, safe)
    else window.sessionStorage.removeItem(OAUTH_NEXT_STORAGE_KEY)
  } catch {
    // Ignore storage errors in restricted browsing modes.
  }
}

/** Reads and removes the saved Google OAuth return path, validating it again before redirecting. */
export function consumeOAuthNextPath(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = window.sessionStorage.getItem(OAUTH_NEXT_STORAGE_KEY)
    window.sessionStorage.removeItem(OAUTH_NEXT_STORAGE_KEY)
    return safeInternalPath(stored)
  } catch {
    return null
  }
}
