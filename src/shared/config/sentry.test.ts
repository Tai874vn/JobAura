import { describe, expect, it } from 'vitest'
import { FALLBACK_SENTRY_DSN, resolveSentryConfig } from './sentry'

describe('resolveSentryConfig', () => {
  it('falls back to the built-in DSN when no Sentry env vars are set', () => {
    for (const runtime of ['client', 'server', 'edge'] as const) {
      const config = resolveSentryConfig({ runtime, nodeEnv: 'production' })
      expect(config.dsn).toBe(FALLBACK_SENTRY_DSN)
    }
  })

  it('ignores blank env values and keeps the fallback DSN', () => {
    const config = resolveSentryConfig({
      runtime: 'server',
      serverDsn: '   ',
      publicDsn: '',
      nodeEnv: 'production',
    })
    expect(config.dsn).toBe(FALLBACK_SENTRY_DSN)
  })

  it('uses NEXT_PUBLIC_SENTRY_DSN on the client and prefers SENTRY_DSN on server and edge', () => {
    const client = resolveSentryConfig({
      runtime: 'client',
      serverDsn: 'https://server@sentry.example/1',
      publicDsn: 'https://public@sentry.example/2',
      nodeEnv: 'production',
    })
    expect(client.dsn).toBe('https://public@sentry.example/2')

    const server = resolveSentryConfig({
      runtime: 'server',
      serverDsn: 'https://server@sentry.example/1',
      publicDsn: 'https://public@sentry.example/2',
      nodeEnv: 'production',
    })
    expect(server.dsn).toBe('https://server@sentry.example/1')

    const edge = resolveSentryConfig({
      runtime: 'edge',
      publicDsn: 'https://public@sentry.example/2',
      nodeEnv: 'production',
    })
    expect(edge.dsn).toBe('https://public@sentry.example/2')
  })

  it('resolves environment from appEnv, then nodeEnv, then development', () => {
    expect(resolveSentryConfig({ runtime: 'client', appEnv: 'staging', nodeEnv: 'production' }).environment).toBe('staging')
    expect(resolveSentryConfig({ runtime: 'client', nodeEnv: 'production' }).environment).toBe('production')
    expect(resolveSentryConfig({ runtime: 'client' }).environment).toBe('development')
  })

  it('keeps production sampling rates and lowers sampling in development', () => {
    const prod = resolveSentryConfig({ runtime: 'client', nodeEnv: 'production' })
    expect(prod.tracesSampleRate).toBe(0.1)
    expect(prod.replaysSessionSampleRate).toBe(0.1)
    expect(prod.replaysOnErrorSampleRate).toBe(1)

    const dev = resolveSentryConfig({ runtime: 'client', nodeEnv: 'development' })
    expect(dev.tracesSampleRate).toBe(0)
    expect(dev.replaysSessionSampleRate).toBe(0)
    expect(dev.replaysOnErrorSampleRate).toBe(0)
  })
})
