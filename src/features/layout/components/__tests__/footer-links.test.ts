import { describe, expect, it } from 'vitest'
import { footerColumns } from '../footer'

const labels = (role: Parameters<typeof footerColumns>[0]) =>
  footerColumns(role).flatMap((column) => column.links.map((link) => link.label))

describe('footerColumns', () => {
  it('never offers sign in or sign up to signed-in people', () => {
    for (const role of ['user', 'employer', 'admin', 'loading'] as const) {
      expect(labels(role)).not.toContain('Sign in')
      expect(labels(role).some((label) => label.startsWith('Create'))).toBe(false)
    }
  })

  it('gives candidates and recruiters their own shortcuts', () => {
    expect(labels('user')).toContain('Hiring posts')
    expect(labels('user')).toContain('Post portfolio')
    expect(labels('employer')).toContain('My hiring posts')
  })

  it('invites visitors to join', () => {
    expect(labels(null)).toContain('Sign in')
    expect(labels(null)).toContain('Create a candidate account')
  })
})
