import { describe, expect, it } from 'vitest'
import { parseTopUpAmount, topUpErrors, vndText } from './top-up-validation'

const bounds = { min: 10, max: 10_000 }

describe('topUpErrors', () => {
  it('accepts the edges', () => {
    expect(topUpErrors('10', bounds)).toBeNull()
    expect(topUpErrors('10000', bounds)).toBeNull()
    expect(topUpErrors('1,250', bounds)).toBeNull()
  })
  it('rejects too small, too large, empty and part credits', () => {
    expect(topUpErrors('9', bounds)).toBe('Enter at least 10 credits.')
    expect(topUpErrors('10001', bounds)).toBe('Enter at most 10,000 credits.')
    expect(topUpErrors('', bounds)).toBe('Enter how many credits to add.')
    expect(topUpErrors('12.5', bounds)).toBe('Use a whole number of credits.')
    expect(topUpErrors('abc', bounds)).toBe('Use a whole number of credits.')
  })
})

describe('parseTopUpAmount', () => {
  it('reads whole numbers only', () => {
    expect(parseTopUpAmount('1,250')).toBe(1250)
    expect(parseTopUpAmount(' 40 ')).toBe(40)
    expect(parseTopUpAmount('12.5')).toBeNull()
    expect(parseTopUpAmount('')).toBeNull()
  })
})

describe('vndText', () => {
  it('writes the test money amount', () => {
    expect(vndText(1250, 1000)).toBe('1,250,000 VND')
    expect(vndText(10, 1000)).toBe('10,000 VND')
  })
})
