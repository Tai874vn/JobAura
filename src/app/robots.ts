import type { MetadataRoute } from 'next'
import { siteOrigin } from '@/shared/lib/seo'
import { buildRobots } from '@/shared/lib/seo-files'

export default function robots(): MetadataRoute.Robots {
  return buildRobots(siteOrigin())
}
