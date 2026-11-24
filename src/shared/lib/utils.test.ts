import { AxiosError } from 'axios'
import { describe, expect, it } from 'vitest'
import { cn, getErrorMessage, initials, resolveAssetUrl, shouldBypassImageOptimizer } from './utils'
import { safeExternalUrl } from './urls'

describe('utils', () => {
  it('merges class names', () => {
    expect(cn('px-2', 'px-4', 'text-sm')).toBe('px-4 text-sm')
  })

  it('extracts error messages from axios, timeout, offline, and generic errors', () => {
    const axiosError = new AxiosError(
      'Request failed',
      undefined,
      undefined,
      undefined,
      { data: { message: 'Server unavailable' } } as never
    )

    expect(getErrorMessage(axiosError)).toBe('Server unavailable')
    expect(getErrorMessage(new Error('Boom'))).toBe('Boom')
    expect(getErrorMessage({})).toBe('Something went wrong')
    const listError = new AxiosError('Bad', undefined, undefined, undefined, { data: { message: ['amount must be a number', 'second'] } } as never)
    expect(getErrorMessage(listError)).toBe('amount must be a number')
    expect(getErrorMessage(new AxiosError('Bad', undefined, undefined, undefined, { data: { message: [] } } as never), 'Fallback')).toBe('Fallback')

    // Plain axios-like errors (e.g. across module boundaries) are detected by axios.isAxiosError.
    expect(getErrorMessage({ isAxiosError: true, response: { data: { message: 'Cross-realm message' } } })).toBe('Cross-realm message')

    // Timeout and offline/network errors return clear plain-English hints.
    expect(getErrorMessage(new AxiosError('timeout of 10000ms exceeded', 'ECONNABORTED'))).toBe('The request timed out. Please try again.')
    expect(getErrorMessage(new AxiosError('timeout', 'ETIMEDOUT'))).toBe('The request timed out. Please try again.')
    expect(getErrorMessage(new AxiosError('Network Error', 'ERR_NETWORK'))).toBe('Unable to reach the server. Check your connection and try again.')
  })

  it('returns initials and resolves asset URLs safely', () => {
    expect(initials('job aura')).toBe('JA')
    expect(initials(undefined)).toBe('J')
    expect(resolveAssetUrl('https://example.com/a.png')).toBe('https://example.com/a.png')
    expect(resolveAssetUrl('images\\avatar.png')).toBe(`${process.env.NEXT_PUBLIC_API_BASE_URL}/images/avatar.png`)
    expect(resolveAssetUrl('blob:http://example.com/a')).toBeUndefined()
    expect(resolveAssetUrl('javascript:alert(1)')).toBeUndefined()
    expect(resolveAssetUrl('http://[invalid')).toBeUndefined()
  })

  it('allows only HTTP(S) links and normalizes host-only websites', () => {
    expect(safeExternalUrl('example.com/profile')).toBe('https://example.com/profile')
    expect(safeExternalUrl('https://example.com/profile')).toBe('https://example.com/profile')
    expect(safeExternalUrl('javascript:alert(1)')).toBeUndefined()
    expect(safeExternalUrl('data:text/html,hello')).toBeUndefined()
  })

  it('detects localhost images for optimizer bypass', () => {
    expect(shouldBypassImageOptimizer('http://localhost:3000/file.png')).toBe(true)
    expect(shouldBypassImageOptimizer('https://cdn.example.com/file.png')).toBe(false)
    expect(shouldBypassImageOptimizer('data:image/png;base64,abc')).toBe(false)
  })
})
