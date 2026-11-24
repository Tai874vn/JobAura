import { describe, expect, it } from 'vitest'
import { isCurrentLink, siteNav } from './site-nav'

const labels = (role?: string) => siteNav(role).main.map((link) => link.label)

describe('siteNav', () => {
  it('leads candidates to hiring posts and their portfolio', () => {
    expect(labels('user')).toEqual(['Home', 'Hiring posts', 'My applications', 'Contracts', 'Portfolios', 'Connections'])
    expect(siteNav('user').search.target).toBe('/hiring-posts')
  })

  it('gives candidates a link to their applications, and nobody else', () => {
    expect(siteNav('user').main).toContainEqual({ href: '/my-applications', label: 'My applications' })
    expect(labels('employer')).not.toContain('My applications')
    expect(labels(undefined)).not.toContain('My applications')
  })

  it('gives candidates and recruiters a Contracts link in the header, and admins one in the account menu', () => {
    expect(siteNav('user').main).toContainEqual({ href: '/contracts', label: 'Contracts' })
    expect(siteNav('employer').main).toContainEqual({ href: '/contracts', label: 'Contracts' })
    expect(siteNav('admin').account).toContainEqual({ href: '/contracts', label: 'Contracts' })
    expect(labels(undefined)).not.toContain('Contracts')
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
    expect(labels('admin')).toEqual(['Admin', 'Home', 'Hiring posts', 'My hiring posts', 'Portfolios', 'Find candidates', 'AI matching', 'Connections'])
    expect(siteNav('admin').main).toContainEqual({ href: '/my-hiring-posts', label: 'My hiring posts', wide: true })
    expect(labels('user')).not.toContain('My hiring posts')
    const account = siteNav('admin').account.map((link) => link.label)
    expect(account).toEqual(expect.arrayContaining(['Home feed', 'My hiring posts', 'My portfolio posts', 'Settings']))
  })

  it('keeps the admin link out of recruiter and candidate headers', () => {
    expect(labels('employer')).not.toContain('Admin')
    expect(labels('user')).not.toContain('Admin')
  })
})

describe('isCurrentLink', () => {
  const hrefs = ['/', '/jobs', '/jobs/new', '/hiring-posts']
  it('marks only the most specific link, so /jobs/new does not also light up /jobs', () => {
    expect(isCurrentLink('/jobs/new', '/jobs/new', hrefs)).toBe(true)
    expect(isCurrentLink('/jobs/new', '/jobs', hrefs)).toBe(false)
  })
  it('still marks the parent link on its other sub pages, and home only on /', () => {
    expect(isCurrentLink('/jobs/42', '/jobs', hrefs)).toBe(true)
    expect(isCurrentLink('/jobs', '/jobs', hrefs)).toBe(true)
    expect(isCurrentLink('/jobs', '/', hrefs)).toBe(false)
    expect(isCurrentLink('/', '/', hrefs)).toBe(true)
  })
})

describe('portfolio links', () => {
  it('has one Portfolios link in the header, never a separate Post portfolio link', () => {
    for (const role of ['user', 'admin', 'employer', undefined]) {
      const all = [...siteNav(role).main, ...siteNav(role).account].map((link) => link.href)
      expect(all).not.toContain('/jobs/new')
    }
    expect(siteNav('user').main).toContainEqual({ href: '/jobs', label: 'Portfolios' })
  })
})
