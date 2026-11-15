import { describe, expect, it } from 'vitest'
import { isPortfolioPost, servicePriceLabel } from './service-price'

describe('servicePriceLabel', () => {
  it('shows a starting rate only when one is set', () => {
    expect(servicePriceLabel(120)).toBe('From $120')
    expect(servicePriceLabel(0)).toBeNull()
    expect(servicePriceLabel(undefined)).toBeNull()
    expect(isPortfolioPost(0)).toBe(true)
    expect(isPortfolioPost(50)).toBe(false)
  })
})
