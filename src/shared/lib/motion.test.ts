import { describe, expect, it } from 'vitest'
import { prefersReducedMotion, scrollBehavior } from './motion'

describe('motion helpers', () => {
  it('defaults prefersReducedMotion to false outside a browser', () => {
    expect(prefersReducedMotion()).toBe(false)
  })

  it('returns auto when reduced motion is preferred and smooth otherwise', () => {
    expect(scrollBehavior(true)).toBe('auto')
    expect(scrollBehavior(false)).toBe('smooth')
  })
})
