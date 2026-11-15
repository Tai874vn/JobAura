import { describe, expect, it } from 'vitest'
import { getSessionExpiredRedirect } from './session-routing'

describe('session expiry routing', () => {
  it('sends anonymous home visits to the public welcome page', () => {
    expect(getSessionExpiredRedirect('/')).toBe('/welcome')
  })

  it('does not interrupt public pages', () => {
    expect(getSessionExpiredRedirect('/welcome')).toBeNull()
    expect(getSessionExpiredRedirect('/jobs')).toBeNull()
    expect(getSessionExpiredRedirect('/jobs/12')).toBeNull()
    expect(getSessionExpiredRedirect('/profile/6')).toBeNull()
    expect(getSessionExpiredRedirect('/auth/login')).toBeNull()
    expect(getSessionExpiredRedirect('/hiring-posts')).toBeNull()
    expect(getSessionExpiredRedirect('/hiring-posts/22')).toBeNull()
  })

  it('sends protected workspaces to login', () => {
    expect(getSessionExpiredRedirect('/settings')).toBe('/auth/login')
    expect(getSessionExpiredRedirect('/my-hiring-posts')).toBe('/auth/login')
  })
})
