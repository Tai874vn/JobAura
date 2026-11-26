import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next'

type ImageRemotePattern = {
  protocol: 'http' | 'https'
  hostname: string
  port?: string
  pathname?: string
}

function imagePatternFromUrl(value: string | undefined): ImageRemotePattern | null {
  if (!value) return null

  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null

    return {
      protocol: url.protocol.slice(0, -1) as 'http' | 'https',
      hostname: url.hostname,
      port: url.port || undefined,
      pathname: '/**',
    }
  } catch {
    return null
  }
}

function imagePatternFromHost(value: string): ImageRemotePattern | null {
  const host = value.trim()
  if (!host) return null
  return imagePatternFromUrl(host.includes('://') ? host : `https://${host}`)
}

const configuredImagePatterns = [
  { protocol: 'http', hostname: 'localhost', pathname: '/**' },
  { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
  { protocol: 'https', hostname: 'i.pravatar.cc', pathname: '/**' },
  { protocol: 'https', hostname: 'lh3.googleusercontent.com', pathname: '/**' },
  imagePatternFromUrl(process.env.NEXT_PUBLIC_API_BASE_URL),
  imagePatternFromUrl(process.env.BACKEND_API_BASE_URL),
  ...(process.env.NEXT_PUBLIC_IMAGE_HOSTS?.split(',').map(imagePatternFromHost) ?? []),
].filter((pattern): pattern is ImageRemotePattern => Boolean(pattern))

const imageRemotePatterns = Array.from(
  new Map(
    configuredImagePatterns.map((pattern) => [
      `${pattern.protocol}:${pattern.hostname}:${pattern.port ?? ''}:${pattern.pathname ?? ''}`,
      pattern,
    ])
  ).values()
)

function originFromUrl(value: string | undefined): string | null {
  if (!value) return null

  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

function websocketOriginFromUrl(value: string | undefined): string | null {
  if (!value) return null

  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${url.host}`
  } catch {
    return null
  }
}

function sourceFromImagePattern(pattern: ImageRemotePattern): string {
  return `${pattern.protocol}://${pattern.hostname}${pattern.port ? `:${pattern.port}` : ''}`
}

function cspDirective(name: string, values: Array<string | null | undefined>): string {
  return `${name} ${Array.from(new Set(values.filter(Boolean))).join(' ')}`
}

const apiOrigins = [
  originFromUrl(process.env.NEXT_PUBLIC_API_BASE_URL),
  originFromUrl(process.env.BACKEND_API_BASE_URL),
]
const websocketOrigins = [
  websocketOriginFromUrl(process.env.NEXT_PUBLIC_API_BASE_URL),
  websocketOriginFromUrl(process.env.BACKEND_API_BASE_URL),
]
const scriptSources = [
  "'self'",
  "'unsafe-inline'",
  ...(process.env.NODE_ENV === 'development' ? ["'unsafe-eval'"] : []),
]
// The video call (LiveKit Cloud) opens a websocket and calls its server over https. blob: workers and media are
// already allowed below, which is what LiveKit needs for the camera and microphone.
const liveKitOrigins = ['wss://*.livekit.cloud', 'https://*.livekit.cloud']
const contentSecurityPolicy = [
  cspDirective('default-src', ["'self'"]),
  cspDirective('base-uri', ["'self'"]),
  cspDirective('object-src', ["'none'"]),
  cspDirective('frame-ancestors', ["'none'"]),
  cspDirective('form-action', ["'self'"]),
  cspDirective('script-src', scriptSources),
  cspDirective('style-src', ["'self'", "'unsafe-inline'"]),
  cspDirective('img-src', ["'self'", 'data:', 'blob:', ...configuredImagePatterns.map(sourceFromImagePattern)]),
  cspDirective('font-src', ["'self'", 'data:']),
  cspDirective('connect-src', ["'self'", ...apiOrigins, ...websocketOrigins, 'https://*.ingest.sentry.io', 'https://*.sentry.io', ...liveKitOrigins]),
  cspDirective('frame-src', ["'self'", 'https://accounts.google.com']),
  cspDirective('worker-src', ["'self'", 'blob:']),
  cspDirective('media-src', ["'self'", 'blob:', 'data:']),
].join('; ')

const contentSecurityPolicyReportOnly = [
  cspDirective('default-src', ["'self'"]),
  cspDirective('base-uri', ["'self'"]),
  cspDirective('object-src', ["'none'"]),
  cspDirective('frame-ancestors', ["'none'"]),
  cspDirective('form-action', ["'self'"]),
  cspDirective('script-src', ["'self'", "'report-sample'"]),
  cspDirective('style-src', ["'self'", "'report-sample'"]),
  cspDirective('img-src', ["'self'", 'data:', 'blob:', ...configuredImagePatterns.map(sourceFromImagePattern)]),
  cspDirective('font-src', ["'self'", 'data:']),
  cspDirective('connect-src', ["'self'", ...apiOrigins, ...websocketOrigins, 'https://*.ingest.sentry.io', 'https://*.sentry.io', ...liveKitOrigins]),
  cspDirective('frame-src', ["'self'", 'https://accounts.google.com']),
  cspDirective('worker-src', ["'self'", 'blob:']),
  cspDirective('media-src', ["'self'", 'blob:', 'data:']),
  cspDirective('report-uri', ['/api/csp-report']),
].join('; ')

const enforceStrictCsp = process.env.CSP_ENFORCE_STRICT === 'true'
const emitCspReportOnly = process.env.CSP_REPORT_ONLY !== 'false'

const securityHeaders = [
  { key: 'Content-Security-Policy', value: enforceStrictCsp ? contentSecurityPolicyReportOnly : contentSecurityPolicy },
  ...(emitCspReportOnly && !enforceStrictCsp
    ? [{ key: 'Content-Security-Policy-Report-Only', value: contentSecurityPolicyReportOnly }]
    : []),
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    // camera and microphone are allowed for this site only (self), for the interview call page.
    // The policy is fixed when the page first loads, and "Join call" opens the call without a
    // full reload, so the allow rule has to be on every page, not only on /interviews/<id>/call.
    key: 'Permissions-Policy',
    value:
      'accelerometer=(), camera=(self), geolocation=(), gyroscope=(), magnetometer=(), microphone=(self), payment=(), usb=()',
  },
]

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Admin pages were renamed to match the backend; old bookmarks keep working.
  async redirects() {
    return [
      { source: '/admin/job-types', destination: '/admin/categories', permanent: true },
      { source: '/admin/job-detail-types', destination: '/admin/subcategories', permanent: true },
      { source: '/admin/hired-jobs', destination: '/admin', permanent: true },
      { source: '/admin/hires', destination: '/admin', permanent: true },
      // "My jobs and hires" is gone: service work now lives on the contracts page. Old links and bookmarks land
      // there straight away, without loading the workspace layout first.
      { source: '/my-jobs', destination: '/contracts', permanent: true },
    ]
  },
  // Local development has no nginx: public images (/uploads/images/...) are fetched from the NestJS dev server,
  // which serves them only outside production. Production keeps nginx as the image server.
  async rewrites() {
    if (process.env.NODE_ENV !== 'development') return []
    const backend = (process.env.BACKEND_API_BASE_URL || 'http://localhost:3002').replace(/\/+$/, '')
    return [{ source: '/uploads/images/:path*', destination: `${backend}/uploads/images/:path*` }]
  },
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: imageRemotePatterns,
    // Serve AVIF, then WebP (smaller picture formats) to browsers that accept them; others get the original.
    formats: ['image/avif', 'image/webp'],
    // Keep each resized picture for at least an hour before checking the source again.
    minimumCacheTTL: 3600,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // Plain picture and font files at the site root (the icon, and any later files in public/) may be kept by
        // the browser for a day and reused for a week while a fresh copy loads. Only one path level matches (no "/"
        // in the name), so /_next/ build files, which Next.js already marks as never changing, are never touched.
        source: '/:file([^/]+\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?))',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
      },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "nguyen-huu-tai",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
