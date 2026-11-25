import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE_NAME } from '@/shared/api/csrf'
import { resolveProxyRedirect } from '@/shared/lib/session-routing'

/**
 * First-pass server redirect for anonymous visitors on `/` and protected routes.
 * Checks only whether the session cookie (csrf_token, set on sign-in and cleared on sign-out)
 * is present. Never calls the backend and never bounces cookie holders off auth pages,
 * because a stale cookie cannot prove a live session; client AuthPageGate and RequireAuth remain the source of truth.
 */
export function proxy(request: NextRequest) {
  // Only redirect page navigations (GET/HEAD); never interrupt Server Actions or form POSTs.
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return NextResponse.next()
  }

  const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value?.trim())
  const redirectTarget = resolveProxyRedirect({
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    hasSessionCookie,
  })

  if (redirectTarget) {
    const response = NextResponse.redirect(new URL(redirectTarget, request.url))
    // Auth redirects depend on the session cookie, so never let shared caches store them.
    response.headers.set('Cache-Control', 'private, no-store')
    response.headers.set('Vary', 'Cookie')
    return response
  }

  return NextResponse.next()
}

export const config = {
  // Exclude API routes, Next.js static/image assets, Sentry's /monitoring tunnel, and metadata files.
  matcher: [
    '/((?!api|_next/static|_next/image|monitoring|icon\\.svg|favicon\\.ico|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest).*)',
  ],
}
