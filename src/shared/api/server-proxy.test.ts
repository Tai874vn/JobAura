import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import {
  buildBackendApiUrl,
  createProxyRequestHeaders,
  createProxyResponseHeaders,
} from './server-proxy'

describe('server API proxy', () => {
  it('builds an encoded backend URL and preserves the query string', () => {
    const requestUrl = new URL(
      'https://jobaura.site/api/jobs/frontend%20developer?page=2',
    )
    const targetUrl = buildBackendApiUrl(
      requestUrl,
      ['jobs', 'frontend developer'],
      'http://backend:3002',
    )

    expect(targetUrl.toString()).toBe(
      'http://backend:3002/api/jobs/frontend%20developer?page=2',
    )
  })

  it('removes transport headers while preserving cookies and original proxy context', () => {
    const request = new NextRequest('http://frontend:3000/api/auth/me', {
      headers: {
        connection: 'keep-alive, x-remove-me',
        cookie: 'access_token=token',
        host: 'frontend:3000',
        'x-forwarded-for': '203.0.113.10',
        'x-forwarded-host': 'jobaura.site',
        'x-forwarded-proto': 'https',
        'x-remove-me': 'remove',
      },
    })

    const headers = createProxyRequestHeaders(request)

    expect(headers.get('connection')).toBeNull()
    expect(headers.get('host')).toBeNull()
    expect(headers.get('x-remove-me')).toBeNull()
    expect(headers.get('accept-encoding')).toBe('identity')
    expect(headers.get('cookie')).toBe('access_token=token')
    expect(headers.get('x-forwarded-for')).toBe('203.0.113.10')
    expect(headers.get('x-forwarded-host')).toBe('jobaura.site')
    expect(headers.get('x-forwarded-proto')).toBe('https')
  })

  it('removes hop-by-hop response headers without dropping application headers', () => {
    const source = new Headers({
      connection: 'keep-alive',
      'content-length': '42',
      'content-type': 'application/json',
      location: 'https://jobaura.site/auth/callback',
      'set-cookie': 'access_token=token; Path=/; HttpOnly',
    })

    const headers = createProxyResponseHeaders(source)

    expect(headers.get('connection')).toBeNull()
    expect(headers.get('content-length')).toBeNull()
    expect(headers.get('content-type')).toBe('application/json')
    expect(headers.get('location')).toBe('https://jobaura.site/auth/callback')
    expect(headers.get('set-cookie')).toContain('access_token=token')
  })
})
