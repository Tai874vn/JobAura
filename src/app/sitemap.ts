import type { MetadataRoute } from 'next'

function siteOrigin() {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001').origin
  } catch {
    return 'http://localhost:3001'
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteOrigin()
  const now = new Date()

  return ['/welcome', '/jobs'].map((path) => ({
    url: `${origin}${path}`,
    lastModified: now,
  }))
}
