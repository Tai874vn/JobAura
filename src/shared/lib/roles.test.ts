import { describe, expect, it } from 'vitest'
import {
  accountRoles,
  canAccessCandidateDirectory,
  canAccessEmployeeTools,
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
    expect(getSignedInRedirect({ role: 'employer' })).toBe('/candidates')
    expect(getSignedInRedirect({ role: 'user' })).toBe('/')
    expect(getSignedInRedirect({ role: 'employer' }, '/settings')).toBe('/settings')
    expect(getSignedInRedirect({ role: 'employer' }, '//evil.example')).toBe('/candidates')
    expect(getSignedInRedirect({ role: 'employer' }, '/\\evil.example')).toBe('/candidates')
    expect(getSignedInRedirect({ role: 'employer' }, 'https://evil.example')).toBe('/candidates')
  })

  it('limits candidate directory access to employers and admins', () => {
    expect(canAccessCandidateDirectory('employer')).toBe(true)
    expect(canAccessCandidateDirectory('admin')).toBe(true)
    expect(canAccessCandidateDirectory('user')).toBe(false)
    expect(canAccessCandidateDirectory(undefined)).toBe(false)
    expect(canAccessRole('employer', ['employer', 'admin'])).toBe(true)
    expect(canAccessRole('user', ['employer', 'admin'])).toBe(false)
  })

  it('keeps employee tools available to normal users and admins', () => {
    expect(canAccessEmployeeTools('user')).toBe(true)
    expect(canAccessEmployeeTools('admin')).toBe(true)
    expect(canAccessEmployeeTools('employer')).toBe(false)
    expect(canAccessEmployeeTools(undefined)).toBe(false)
  })
})
