import { describe, expect, it } from 'vitest'
import { siteNav } from './site-nav'

const labels = (role?: string) => siteNav(role).main.map((link) => link.label)

describe('siteNav', () => {
  it('leads candidates to hiring posts and their portfolio', () => {
    expect(labels('user')).toEqual(['Home', 'Hiring posts', 'Post portfolio', 'Connections'])
    expect(siteNav('user').search.target).toBe('/hiring-posts')
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

  it('adds the admin area for admins', () => {
    expect(labels('admin')).toContain('Admin')
    expect(siteNav('admin').home).toBe('/admin')
  })
})
