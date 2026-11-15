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

  it('routes signed-in users by role', () => {
    expect(getSignedInRedirect({ role: 'admin' })).toBe('/admin')
    expect(getSignedInRedirect({ role: 'employer' })).toBe('/my-hiring-posts')
    expect(getSignedInRedirect({ role: 'user' })).toBe('/')
    expect(getSignedInRedirect({ role: 'employer' }, '/settings')).toBe('/settings')
    expect(getSignedInRedirect({ role: 'employer' }, '//evil.example')).toBe('/my-hiring-posts')
    expect(getSignedInRedirect({ role: 'employer' }, '/\\evil.example')).toBe('/my-hiring-posts')
    expect(getSignedInRedirect({ role: 'employer' }, 'https://evil.example')).toBe('/my-hiring-posts')
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
