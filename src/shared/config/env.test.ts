import { describe, expect, it } from 'vitest'
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
