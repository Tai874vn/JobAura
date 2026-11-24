import { describe, expect, it } from 'vitest'
import {
  accountRoles,
  canAccessCandidateDirectory,
  canAccessCandidateTools,
  canAccessRole,
  getSignedInRedirect,
  isAccountRole,
  signupRoleOptions,
} from './roles'

describe('account roles', () => {
  it('defines the frontend role pool', () => {
    expect(accountRoles).toEqual(['user', 'employer', 'admin'])
    expect(signupRoleOptions.map((option) => option.value)).toEqual(['user', 'employer'])
  })

  it('validates known role strings', () => {
    expect(isAccountRole('employer')).toBe(true)
    expect(isAccountRole('recruiting-admin')).toBe(false)
  })

  it('routes signed-in users by role and falls back for every open-redirect attack string', () => {
    expect(getSignedInRedirect({ role: 'admin' })).toBe('/admin')
    expect(getSignedInRedirect({ role: 'employer' })).toBe('/my-hiring-posts')
    expect(getSignedInRedirect({ role: 'user' })).toBe('/')
    expect(getSignedInRedirect({ role: 'employer' }, '/settings')).toBe('/settings')
    expect(getSignedInRedirect({ role: 'user' }, '/contracts?contract=42#top')).toBe('/contracts?contract=42#top')

    for (const attack of [
      '/.//evil.com',
      '/..//evil.com',
      '/a/..//evil.com',
      '/%2e//evil.com',
      '/%2e%2e//evil.com',
      '//evil.example',
      '/\\evil.example',
      '/%2f/evil.com',
      '/%5cevil.com',
      'https://evil.example',
      '/%0d%0aSet-Cookie:a=b',
      '/%E0%A4%A',
    ]) {
      expect(getSignedInRedirect({ role: 'employer' }, attack)).toBe('/my-hiring-posts')
      expect(getSignedInRedirect({ role: 'user' }, attack)).toBe('/')
    }
  })

  it('limits candidate directory access to employers and admins', () => {
    expect(canAccessCandidateDirectory('employer')).toBe(true)
    expect(canAccessCandidateDirectory('admin')).toBe(true)
    expect(canAccessCandidateDirectory('user')).toBe(false)
    expect(canAccessCandidateDirectory(undefined)).toBe(false)
    expect(canAccessRole('employer', ['employer', 'admin'])).toBe(true)
    expect(canAccessRole('user', ['employer', 'admin'])).toBe(false)
  })

  it('keeps candidate tools available to candidates and admins', () => {
    expect(canAccessCandidateTools('user')).toBe(true)
    expect(canAccessCandidateTools('admin')).toBe(true)
    expect(canAccessCandidateTools('employer')).toBe(false)
    expect(canAccessCandidateTools(undefined)).toBe(false)
  })
})
