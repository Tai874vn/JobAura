import { describe, expect, it } from 'vitest'
import { buildRobots, buildSitemap } from '../seo-files'

const origin = 'https://jobaura.example'

describe('buildRobots', () => {
  it('allows the public site, blocks signed-in pages and points at the sitemap', () => {
    const robots = buildRobots(origin)
    const rules = Array.isArray(robots.rules) ? robots.rules[0] : robots.rules

    expect(rules.userAgent).toBe('*')
    expect(rules.allow).toBe('/')
    for (const path of ['/admin', '/contracts', '/my-applications', '/my-hiring-posts', '/wallet', '/settings', '/jobs/new', '/jobs/*/edit', '/interviews/', '/api/', '/auth/callback', '/logout']) {
      expect(rules.disallow).toContain(path)
    }
    for (const path of ['/welcome', '/jobs', '/hiring-posts', '/profile']) {
      expect(rules.disallow).not.toContain(path)
    }
    expect(robots.sitemap).toBe(`${origin}/sitemap.xml`)
  })
})

describe('buildSitemap', () => {
  it('always lists the fixed public pages', () => {
    const urls = buildSitemap(origin).map((entry) => entry.url)

    expect(urls).toEqual([`${origin}/welcome`, `${origin}/hiring-posts`, `${origin}/jobs`])
  })

  it('adds open hiring posts, portfolio posts and their owners once each, and skips closed posts', () => {
    const sitemap = buildSitemap(origin, {
      posts: [
        { id: 7, status: 'OPEN', updatedAt: '2026-11-20T10:00:00.000Z' },
        { id: 8, status: 'CLOSED' },
        { id: 7, status: 'OPEN' },
      ],
      jobs: [
        { id: 3, user: { id: 11 }, createdAt: '2026-11-01T00:00:00.000Z' },
        { id: 4, creatorId: 11, updatedAt: 'not a date' },
        { id: 0 },
      ],
    })
    const urls = sitemap.map((entry) => entry.url)

    expect(urls).toEqual([
      `${origin}/welcome`,
      `${origin}/hiring-posts`,
      `${origin}/jobs`,
      `${origin}/hiring-posts/7`,
      `${origin}/jobs/3`,
      `${origin}/jobs/4`,
      `${origin}/profile/11`,
    ])
    expect(sitemap.find((entry) => entry.url.endsWith('/hiring-posts/7'))?.lastModified).toEqual(new Date('2026-11-20T10:00:00.000Z'))
    expect(sitemap.find((entry) => entry.url.endsWith('/jobs/4'))).not.toHaveProperty('lastModified')
    expect(sitemap.find((entry) => entry.url.endsWith('/welcome'))).not.toHaveProperty('lastModified')
  })
})
