import { describe, expect, it } from 'vitest'
import { siteNav } from './site-nav'

const labels = (role?: string) => siteNav(role).main.map((link) => link.label)

describe('siteNav', () => {
  it('leads candidates to hiring posts and their portfolio', () => {
    expect(labels('user')).toEqual(['Home', 'Hiring posts', 'My applications', 'Post portfolio', 'Connections'])
    expect(siteNav('user').search.target).toBe('/hiring-posts')
  })

  it('gives candidates a link to their applications, and nobody else', () => {
    expect(siteNav('user').main).toContainEqual({ href: '/my-applications', label: 'My applications' })
    expect(labels('employer')).not.toContain('My applications')
    expect(labels(undefined)).not.toContain('My applications')
  })

  it('starts recruiters at their own hiring posts and searches candidates', () => {
    expect(siteNav('employer').home).toBe('/my-hiring-posts')
    expect(labels('employer')[0]).toBe('My hiring posts')
    expect(siteNav('employer').search.target).toBe('/candidates')
  })

  it('shows visitors hiring posts first', () => {
    expect(labels(undefined)).toEqual(['Hiring posts', 'Portfolios'])
    expect(siteNav(null).home).toBe('/welcome')
  })

  it('gives admins every area: admin pages, both public lists, and both roles\' tools', () => {
    expect(siteNav('admin').home).toBe('/')
    expect(labels('admin')).toEqual(['Admin', 'Home', 'Hiring posts', 'Portfolios', 'Post portfolio', 'Find candidates', 'AI matching', 'Connections'])
    const account = siteNav('admin').account.map((link) => link.label)
    expect(account).toEqual(expect.arrayContaining(['Home feed', 'My hiring posts', 'Post portfolio', 'My portfolio posts', 'Settings']))
  })

  it('keeps the admin link out of recruiter and candidate headers', () => {
    expect(labels('employer')).not.toContain('Admin')
    expect(labels('user')).not.toContain('Admin')
  })
})
