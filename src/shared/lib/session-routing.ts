export function getSessionExpiredRedirect(pathname: string) {
  if (pathname === '/') return '/welcome'

  const isPublic =
    pathname === '/welcome' ||
    pathname === '/jobs' ||
    /^\/jobs\/\d+$/.test(pathname) ||
    /^\/profile\/\d+$/.test(pathname) ||
    pathname.startsWith('/auth/')

  return isPublic ? null : '/auth/login'
}
