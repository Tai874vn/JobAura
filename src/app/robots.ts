/**
 * Builds the /robots.txt rules for search engine crawlers.
 *
 * Calls: siteOrigin; buildRobots
 * Used by:
 *   - Next.js router: serves /robots.txt
 */

import type { MetadataRoute } from 'next'
import { siteOrigin } from '@/shared/lib/seo'
import { buildRobots } from '@/shared/lib/seo-files'

export default function robots(): MetadataRoute.Robots {
  return buildRobots(siteOrigin())
}
