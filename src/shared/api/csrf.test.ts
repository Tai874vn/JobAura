import { describe, expect, it } from 'vitest'
import { csrfTokenFromCookie, hasCsrfTokenCookie } from './csrf'

describe('csrfTokenFromCookie', () => {
  it('reads and decodes the CSRF token from a cookie header', () => {
    expect(csrfTokenFromCookie('theme=dark; csrf_token=abc%2F123; session=x')).toBe('abc/123')
  })

  it('returns undefined when the CSRF cookie is absent', () => {
    expect(csrfTokenFromCookie('theme=dark')).toBeUndefined()
  })

  it('detects whether a CSRF cookie is present', () => {
    expect(hasCsrfTokenCookie('theme=dark; csrf_token=abc123')).toBe(true)
    expect(hasCsrfTokenCookie('theme=dark')).toBe(false)
  })
})
