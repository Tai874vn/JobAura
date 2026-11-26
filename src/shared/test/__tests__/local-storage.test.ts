import { describe, expect, it } from 'vitest'

describe('test storage environment', () => {
  it('provides localStorage for persisted stores', () => {
    expect(globalThis.localStorage).toBeDefined()
    globalThis.localStorage.setItem('jobaura-test', 'available')
    expect(globalThis.localStorage.getItem('jobaura-test')).toBe('available')
  })
})
