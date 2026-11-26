import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildLoginRedirect,
  consumeOAuthNextPath,
  getSessionExpiredRedirect,
  isProtectedProxyPath,
  resolveProxyRedirect,
  safeInternalPath,
  storeOAuthNextPath,
} from '../session-routing'

const ATTACK_STRINGS = [
  '/.//evil.com',
  '/..//evil.com',
  '/a/..//evil.com',
  '/%2e//evil.com',
  '/%2e%2e//evil.com',
  '/%252e//evil.com',
  '//evil.com',
  '//evil.example/settings',
  '/\\evil.com',
  '/\\evil.example',
  '/%2f/evil.com',
  '/%5cevil.com',
  'https://evil.example/settings',
  'http://jobaura.invalid/settings',
  'settings',
  '/settings\r\nSet-Cookie:a=b',
  '/%0d%0aSet-Cookie:a=b',
  '\t//evil.com',
  '/%E0%A4%A',
  '/%61uth/login',
] as const

describe('safeInternalPath', () => {
  it('accepts safe internal paths with query strings and hashes', () => {
    expect(safeInternalPath('/')).toBe('/')
    expect(safeInternalPath('/settings')).toBe('/settings')
    expect(safeInternalPath('/settings?section=resume#career')).toBe('/settings?section=resume#career')
    expect(safeInternalPath('/contracts?contract=42')).toBe('/contracts?contract=42')
    expect(safeInternalPath('/author/12')).toBe('/author/12')
    expect(safeInternalPath('/wallet/top-up/return?vnp_Amount=10000&vnp_OrderInfo=Top%20up')).toBe(
      '/wallet/top-up/return?vnp_Amount=10000&vnp_OrderInfo=Top%20up',
    )
  })

  it('blocks open redirects, dot-segment normalisations, control chars, and malformed paths', () => {
    expect(safeInternalPath(null)).toBeNull()
    expect(safeInternalPath(undefined)).toBeNull()
    expect(safeInternalPath('')).toBeNull()
    for (const attack of ATTACK_STRINGS) {
      expect(safeInternalPath(attack), `should reject ${JSON.stringify(attack)}`).toBeNull()
    }
  })

  it('blocks auth, logout, and api paths to prevent redirect loops and unintended sign-outs', () => {
    expect(safeInternalPath('/auth')).toBeNull()
    expect(safeInternalPath('/auth/login')).toBeNull()
    expect(safeInternalPath('/auth/login?next=/settings')).toBeNull()
    expect(safeInternalPath('/auth/register')).toBeNull()
    expect(safeInternalPath('/auth/callback')).toBeNull()
    expect(safeInternalPath('/logout')).toBeNull()
    expect(safeInternalPath('/logout?all=1')).toBeNull()
    expect(safeInternalPath('/api/auth/me')).toBeNull()
    expect(safeInternalPath('/API/users')).toBeNull()
  })
})

describe('OAuth next path helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('stores and consumes safe internal paths while rejecting attack strings', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('window', {
      sessionStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
        removeItem: (key: string) => store.delete(key),
      },
    })

    storeOAuthNextPath('/contracts?contract=42')
    expect(consumeOAuthNextPath()).toBe('/contracts?contract=42')
    expect(consumeOAuthNextPath()).toBeNull()

    for (const attack of ATTACK_STRINGS) {
      storeOAuthNextPath(attack)
      expect(consumeOAuthNextPath()).toBeNull()
      store.set('jobaura:oauth-next', attack)
      expect(consumeOAuthNextPath()).toBeNull()
    }
  })
})

describe('buildLoginRedirect', () => {
  it('preserves pathname and query string in ?next=', () => {
    expect(buildLoginRedirect('/settings', '?section=resume')).toBe(
      '/auth/login?next=%2Fsettings%3Fsection%3Dresume',
    )
    expect(buildLoginRedirect('/wallet/top-up/return', 'vnp_Amount=10000&vnp_ResponseCode=00')).toBe(
      '/auth/login?next=%2Fwallet%2Ftop-up%2Freturn%3Fvnp_Amount%3D10000%26vnp_ResponseCode%3D00',
    )
  })

  it('drops unsafe or disallowed destinations to bare /auth/login', () => {
    expect(buildLoginRedirect('/auth/login')).toBe('/auth/login')
    expect(buildLoginRedirect('/logout')).toBe('/auth/login')
  })
})

describe('session expiry routing', () => {
  it('sends anonymous home visits to the public welcome page', () => {
    expect(getSessionExpiredRedirect('/')).toBe('/welcome')
  })

  it('does not interrupt public or auth/logout pages', () => {
    expect(getSessionExpiredRedirect('/welcome')).toBeNull()
    expect(getSessionExpiredRedirect('/jobs')).toBeNull()
    expect(getSessionExpiredRedirect('/jobs/12')).toBeNull()
    expect(getSessionExpiredRedirect('/profile/6')).toBeNull()
    expect(getSessionExpiredRedirect('/auth/login')).toBeNull()
    expect(getSessionExpiredRedirect('/logout')).toBeNull()
    expect(getSessionExpiredRedirect('/hiring-posts')).toBeNull()
    expect(getSessionExpiredRedirect('/hiring-posts/22')).toBeNull()
  })

  it('sends protected workspaces to login while keeping the return path and query string', () => {
    expect(getSessionExpiredRedirect('/settings')).toBe('/auth/login?next=%2Fsettings')
    expect(getSessionExpiredRedirect('/my-hiring-posts')).toBe('/auth/login?next=%2Fmy-hiring-posts')
    expect(getSessionExpiredRedirect('/contracts', '?contract=42')).toBe(
      '/auth/login?next=%2Fcontracts%3Fcontract%3D42',
    )
  })
})

describe('edge proxy routing', () => {
  it('identifies protected private paths without flagging public pages', () => {
    expect(isProtectedProxyPath('/admin')).toBe(true)
    expect(isProtectedProxyPath('/admin/users')).toBe(true)
    expect(isProtectedProxyPath('/contracts')).toBe(true)
    expect(isProtectedProxyPath('/my-hiring-posts/9/applicants')).toBe(true)
    expect(isProtectedProxyPath('/wallet/top-up/return')).toBe(true)
    expect(isProtectedProxyPath('/jobs/new')).toBe(true)
    expect(isProtectedProxyPath('/jobs/42/edit')).toBe(true)
    expect(isProtectedProxyPath('/interviews/8/call')).toBe(true)

    expect(isProtectedProxyPath('/welcome')).toBe(false)
    expect(isProtectedProxyPath('/jobs')).toBe(false)
    expect(isProtectedProxyPath('/jobs/42')).toBe(false)
    expect(isProtectedProxyPath('/hiring-posts')).toBe(false)
    expect(isProtectedProxyPath('/hiring-posts/5')).toBe(false)
    expect(isProtectedProxyPath('/profile/7')).toBe(false)
    expect(isProtectedProxyPath('/unknown-route')).toBe(false)
  })

  it('redirects anonymous traffic on / and protected routes while passing public pages through', () => {
    expect(resolveProxyRedirect({ pathname: '/', hasSessionCookie: false })).toBe('/welcome')
    expect(
      resolveProxyRedirect({
        pathname: '/interviews/8/call',
        search: '?application=9',
        hasSessionCookie: false,
      }),
    ).toBe('/auth/login?next=%2Finterviews%2F8%2Fcall%3Fapplication%3D9')
    expect(resolveProxyRedirect({ pathname: '/welcome', hasSessionCookie: false })).toBeNull()
    expect(resolveProxyRedirect({ pathname: '/jobs/12', hasSessionCookie: false })).toBeNull()
    expect(resolveProxyRedirect({ pathname: '/hiring-posts', hasSessionCookie: false })).toBeNull()
    expect(resolveProxyRedirect({ pathname: '/auth/login', hasSessionCookie: false })).toBeNull()
    expect(resolveProxyRedirect({ pathname: '/logout', hasSessionCookie: false })).toBeNull()
  })

  it('never redirects /auth/login or /auth/register regardless of session cookie presence', () => {
    for (const hasSessionCookie of [false, true]) {
      for (const pathname of ['/auth/login', '/auth/register']) {
        expect(resolveProxyRedirect({ pathname, hasSessionCookie })).toBeNull()
        expect(
          resolveProxyRedirect({
            pathname,
            search: '?next=%2Fcontracts%3Fcontract%3D42',
            hasSessionCookie,
          }),
        ).toBeNull()
        expect(
          resolveProxyRedirect({
            pathname,
            search: '?next=/.//evil.com',
            hasSessionCookie,
          }),
        ).toBeNull()
        expect(
          resolveProxyRedirect({
            pathname,
            search: '?notice=google-role-required',
            hasSessionCookie,
          }),
        ).toBeNull()
      }
    }
    expect(resolveProxyRedirect({ pathname: '/auth/callback', hasSessionCookie: true })).toBeNull()
    expect(resolveProxyRedirect({ pathname: '/settings', hasSessionCookie: true })).toBeNull()
    expect(resolveProxyRedirect({ pathname: '/', hasSessionCookie: true })).toBeNull()
  })
})
