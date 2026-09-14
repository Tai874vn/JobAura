import { describe, expect, it } from 'vitest'
import { resolveClientOrigin } from './client-origin'

describe('resolveClientOrigin', () => {
  it('uses the current browser origin when same-origin proxying is enabled', () => {
    expect(resolveClientOrigin(
      'https://offline-tunnel.example',
      true,
      'http://localhost:8080'
    )).toBe('http://localhost:8080')
  })

  it('keeps the configured API origin for direct development', () => {
    expect(resolveClientOrigin(
      'http://localhost:3002',
      false,
      'http://localhost:3000'
    )).toBe('http://localhost:3002')
  })
})
