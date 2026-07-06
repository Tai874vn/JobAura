import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'JobAura',
    short_name: 'JobAura',
    description: 'Find trusted freelance services and manage work in one marketplace.',
    start_url: '/welcome',
    display: 'standalone',
    background_color: '#fbf9f8',
    theme_color: '#006d43',
  }
}
