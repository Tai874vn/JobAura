import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'JobAura',
    short_name: 'JobAura',
    description: 'Find a role, show your work, or hire the right person, with AI matching built in.',
    start_url: '/welcome',
    display: 'standalone',
    background_color: '#fbf9f8',
    theme_color: '#006d43',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  }
}
