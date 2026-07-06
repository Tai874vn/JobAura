import type { MetadataRoute } from 'next'

function siteOrigin() {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001').origin
  } catch {
    return 'http://localhost:3001'
  }
}

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/connections',
        '/logout',
        '/my-jobs',
        '/my-posts',
        '/recommendations',
        '/saved',
        '/settings',
      ],
    },
    sitemap: `${siteOrigin()}/sitemap.xml`,
  }
}
