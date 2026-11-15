const INTERNAL_NAVIGATION_ORIGIN = 'https://jobaura.local'

export function safeInternalPath(value: string | null | undefined) {
  const path = value?.trim()
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return null

  try {
    const url = new URL(path, INTERNAL_NAVIGATION_ORIGIN)
    if (url.origin !== INTERNAL_NAVIGATION_ORIGIN) return null
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return null
  }
}

export function getSessionExpiredRedirect(pathname: string) {
  if (pathname === '/') return '/welcome'

  const isPublic =
    pathname === '/welcome' ||
    pathname === '/jobs' ||
    pathname === '/hiring-posts' ||
    /^\/hiring-posts\/\d+$/.test(pathname) ||
    /^\/jobs\/\d+$/.test(pathname) ||
    /^\/profile\/\d+$/.test(pathname) ||
    pathname.startsWith('/auth/')

  return isPublic ? null : '/auth/login'
}
