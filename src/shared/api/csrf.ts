const UNSAFE_METHODS = new Set(['post', 'put', 'patch', 'delete'])

export function csrfTokenFromCookie(cookieHeader: string): string | undefined {
  const value = cookieHeader
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith('csrf_token='))
    ?.slice('csrf_token='.length)
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
