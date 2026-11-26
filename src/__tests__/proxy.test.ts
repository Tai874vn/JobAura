import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'
import { SESSION_COOKIE_NAME } from '@/shared/api/csrf'
import { proxy } from '../proxy'

describe('proxy', () => {
  it('marks anonymous root redirects as private and non-cacheable with Vary: Cookie', () => {
    const request = new NextRequest('https://jobaura.example/')
    const response = proxy(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://jobaura.example/welcome')
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(response.headers.get('vary')).toBe('Cookie')
  })

  it('marks anonymous protected-route redirects as private and non-cacheable with Vary: Cookie', () => {
    const request = new NextRequest('https://jobaura.example/settings?section=resume')
    const response = proxy(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'https://jobaura.example/auth/login?next=%2Fsettings%3Fsection%3Dresume',
    )
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(response.headers.get('vary')).toBe('Cookie')
  })

  it('passes through when the session cookie is present', () => {
    const request = new NextRequest('https://jobaura.example/settings', {
      headers: { cookie: `${SESSION_COOKIE_NAME}=valid-token` },
    })
    const response = proxy(request)

    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
  })

  it('passes through non-GET/HEAD requests without redirecting', () => {
    const request = new NextRequest('https://jobaura.example/settings', {
      method: 'POST',
    })
    const response = proxy(request)

    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
  })
})
