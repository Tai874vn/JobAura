/**
 * Builds the robots.txt rules and sitemap.xml entries for search engine crawlers.
 * Disallows signed-in and auth routes, and lists public pages, open hiring posts, portfolio posts, and public profiles.
 *
 * Calls: PROTECTED_PREFIXES
 * Used by:
 *   - app/robots.ts
 *   - app/sitemap.ts
 */

import type { MetadataRoute } from 'next'
import { PROTECTED_PREFIXES } from './session-routing'

/**
 * Pure builders for robots.txt and sitemap.xml (the files that tell search engines what to read and what to skip).
 * src/app/robots.ts and src/app/sitemap.ts only fetch data and call these, so the output can be tested.
 */

/** Public pages that are always in the sitemap. */
export const staticSitemapPaths = ['/welcome', '/hiring-posts', '/jobs'] as const

/** Pages crawlers must skip: every signed-in page, plus sign-in plumbing, the API and the error tunnel. */
export const robotsDisallowPaths = [
  ...PROTECTED_PREFIXES,
  '/jobs/*/edit',
  '/interviews/',
  '/auth/callback',
  '/logout',
  '/api/',
  '/monitoring',
] as const

export function buildRobots(origin: string): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [...robotsDisallowPaths],
    },
    sitemap: `${origin}/sitemap.xml`,
  }
}

type SitemapItem = { id: number; updatedAt?: string | null; createdAt?: string | null }
type SitemapJob = SitemapItem & { creatorId?: number | null; user?: { id?: number | null } | null }
type SitemapPost = SitemapItem & { status?: string | null }

function positiveId(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 ? value : null
}

/** A real date from the item, or undefined (then the sitemap simply leaves lastModified out). */
function lastModified(item: SitemapItem): Date | undefined {
  const raw = item.updatedAt || item.createdAt
  if (!raw) return undefined
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? undefined : date
}

/**
 * The sitemap: the fixed public pages, each open hiring post, each portfolio or service post, and the public
 * profile of each person who has such a post. Closed hiring posts are left out (they are private and noindex).
 * Each address appears once.
 */
export function buildSitemap(
  origin: string,
  { jobs = [], posts = [] }: { jobs?: SitemapJob[]; posts?: SitemapPost[] } = {},
): MetadataRoute.Sitemap {
  const entries = new Map<string, MetadataRoute.Sitemap[number]>()
  const add = (path: string, modified?: Date, changeFrequency?: 'daily' | 'weekly') => {
    const url = `${origin}${path}`
    if (entries.has(url)) return
    entries.set(url, {
      url,
      ...(modified ? { lastModified: modified } : {}),
      ...(changeFrequency ? { changeFrequency } : {}),
    })
  }

  // The fixed pages carry no lastModified: stamping them with the build time each hour would be a false signal.
  for (const path of staticSitemapPaths) add(path, undefined, 'daily')

  for (const post of posts) {
    const id = positiveId(post.id)
    if (!id || (post.status && post.status !== 'OPEN')) continue
    add(`/hiring-posts/${id}`, lastModified(post), 'weekly')
  }

  const creators = new Set<number>()
  for (const job of jobs) {
    const id = positiveId(job.id)
    if (!id) continue
    add(`/jobs/${id}`, lastModified(job), 'weekly')
    const creatorId = positiveId(job.user?.id ?? job.creatorId)
    if (creatorId) creators.add(creatorId)
  }
  for (const creatorId of creators) add(`/profile/${creatorId}`, undefined, 'weekly')

  return [...entries.values()]
}
