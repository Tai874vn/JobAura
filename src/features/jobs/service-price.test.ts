import { describe, expect, it } from 'vitest'
import { isPortfolioPost, servicePriceLabel, workModeLine } from './service-price'

describe('servicePriceLabel', () => {
  it('shows a starting rate in credits only when one is set', () => {
    expect(servicePriceLabel(1250)).toBe('From 1,250 credits')
    expect(servicePriceLabel(1)).toBe('From 1 credit')
    expect(servicePriceLabel(0)).toBeNull()
    expect(servicePriceLabel(undefined)).toBeNull()
    expect(isPortfolioPost(0)).toBe(true)
    expect(isPortfolioPost(50)).toBe(false)
  })
})

describe('workModeLine', () => {
  it('names where the work happens', () => {
    expect(workModeLine('REMOTE', null)).toBe('Remote')
    expect(workModeLine(undefined, null)).toBe('Remote')
    expect(workModeLine('ONSITE', 'Hanoi')).toBe('Onsite in Hanoi')
    expect(workModeLine('BOTH', 'Hanoi')).toBe('Remote or onsite in Hanoi')
    expect(workModeLine('ONSITE', '')).toBe('Onsite')
  })
})
