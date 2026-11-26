import { describe, expect, it, vi } from 'vitest'

// Sentry only wraps the config for the build; the test reads the plain Next.js config.
vi.mock('@sentry/nextjs', () => ({ withSentryConfig: (config: unknown) => config }))

describe('next.config', () => {
  it('sends old /my-jobs links to the contracts page', async () => {
    const { default: config } = await import('../../../next.config')
    const redirects = await config.redirects!()

    expect(redirects).toContainEqual({ source: '/my-jobs', destination: '/contracts', permanent: true })
  })

  it('caches root picture and font files only, never Next.js build files', async () => {
    const { default: config } = await import('../../../next.config')
    const rule = (await config.headers!()).find((entry) => entry.headers.some((header) => header.key === 'Cache-Control'))!
    // The rule is "/:file(<regex>)"; this checks the regex part against sample paths.
    const pattern = new RegExp(`^/${rule.source.slice('/:file('.length, -1)}$`)

    expect(pattern.test('/icon.svg')).toBe(true)
    expect(pattern.test('/logo.png')).toBe(true)
    expect(pattern.test('/mypng')).toBe(false)
    expect(pattern.test('/profile-ico')).toBe(false)
    expect(pattern.test('/_next/static/media/font.woff2')).toBe(false)
  })

  it('sends public images to the backend only in local development', async () => {
    const { default: config } = await import('../../../next.config')
    vi.stubEnv('NODE_ENV', 'production')
    expect(await config.rewrites!()).toEqual([])
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('BACKEND_API_BASE_URL', 'http://localhost:3002/')
    expect(await config.rewrites!()).toEqual([
      { source: '/uploads/images/:path*', destination: 'http://localhost:3002/uploads/images/:path*' },
    ])
    vi.unstubAllEnvs()
  })
})
