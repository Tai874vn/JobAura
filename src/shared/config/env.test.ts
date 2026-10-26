import { afterEach, describe, expect, it, vi } from 'vitest'
import { requireHttpBaseUrl } from './env'

describe('environment URL validation', () => {
  it('normalizes valid HTTP base URLs', () => {
    expect(requireHttpBaseUrl('API_URL', ' https://jobaura.site/ ')).toBe('https://jobaura.site')
    expect(requireHttpBaseUrl('API_URL', 'http://backend:3002/')).toBe('http://backend:3002')
  })

  it('rejects relative and unsafe base URLs', () => {
    const credentialBearingUrl = ['https://user', 'placeholder@example.com'].join(':')

    expect(() => requireHttpBaseUrl('API_URL', 'jobaura.site')).toThrow(/absolute HTTP\(S\) origin/)
    expect(() => requireHttpBaseUrl('API_URL', '/api')).toThrow(/absolute HTTP\(S\) origin/)
    expect(() => requireHttpBaseUrl('API_URL', 'https://jobaura.site/api')).toThrow(/absolute HTTP\(S\) origin/)
    expect(() => requireHttpBaseUrl('API_URL', 'javascript:alert(1)')).toThrow(/absolute HTTP\(S\) origin/)
    expect(() => requireHttpBaseUrl('API_URL', credentialBearingUrl)).toThrow(/absolute HTTP\(S\) origin/)
  })
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('frontend environment modes', () => {
  it('supports direct local development without a browser Google client ID', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'http://localhost:3002')
    vi.stubEnv('BACKEND_API_BASE_URL', 'http://localhost:3002')
    vi.stubEnv('NEXT_PUBLIC_USE_SAME_ORIGIN_API', 'false')
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', undefined)

    const { env, getServerEnv } = await import('./env')
    expect(env.apiBaseUrl).toBe('http://localhost:3002')
    expect(env.useSameOriginApi).toBe(false)
    expect(env).not.toHaveProperty('googleClientId')
    expect(getServerEnv().backendApiBaseUrl).toBe('http://localhost:3002')
  })

  it('keeps the production browser and internal server addresses separate', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://www.jobaura.site')
    vi.stubEnv('BACKEND_API_BASE_URL', 'http://backend:3002')
    vi.stubEnv('NEXT_PUBLIC_USE_SAME_ORIGIN_API', 'true')
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', undefined)

    const { env, getServerEnv } = await import('./env')
    expect(env.apiBaseUrl).toBe('https://www.jobaura.site')
    expect(env.useSameOriginApi).toBe(true)
    expect(getServerEnv().backendApiBaseUrl).toBe('http://backend:3002')
  })
})
