import { AxiosError } from 'axios'
import { describe, expect, it } from 'vitest'
import { cn, currency, getErrorMessage, initials, resolveAssetUrl, shouldBypassImageOptimizer } from './utils'

describe('utils', () => {
  it('merges class names and formats currency', () => {
    expect(cn('px-2', 'px-4', 'text-sm')).toBe('px-4 text-sm')
    expect(currency(2500)).toBe('$2,500')
    expect(currency(undefined)).toBe('$0')
  })

  it('extracts error messages from axios and generic errors', () => {
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
  })

  it('returns initials and resolves asset URLs safely', () => {
    expect(initials('job aura')).toBe('JA')
    expect(initials(undefined)).toBe('J')
    expect(resolveAssetUrl('https://example.com/a.png')).toBe('https://example.com/a.png')
    expect(resolveAssetUrl('images\\avatar.png')).toBe('http://localhost:3000/images/avatar.png')
    expect(resolveAssetUrl('blob:http://example.com/a')).toBeUndefined()
    expect(resolveAssetUrl('http://[invalid')).toBeUndefined()
  })

  it('detects localhost images for optimizer bypass', () => {
    expect(shouldBypassImageOptimizer('http://localhost:3000/file.png')).toBe(true)
    expect(shouldBypassImageOptimizer('https://cdn.example.com/file.png')).toBe(false)
    expect(shouldBypassImageOptimizer('data:image/png;base64,abc')).toBe(false)
  })
})
