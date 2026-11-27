/**
 * Builds the web app manifest for JobAura. It defines the app name, start page, theme colors, and icon used when someone installs the site.
 *
 * Calls: nothing from this project
 * Used by:
 *   - Next.js router: serves /manifest.webmanifest
 */

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
