import { describe, expect, it } from 'vitest'
import { credits } from '../credits'

describe('credits', () => {
  it('writes the number with thousands commas and the word credits', () => {
    expect(credits(0)).toBe('0 credits')
    expect(credits(1250)).toBe('1,250 credits')
    expect(credits(10000)).toBe('10,000 credits')
  })

  it('says "1 credit" for exactly one', () => {
    expect(credits(1)).toBe('1 credit')
    expect(credits(-1, { sign: true })).toBe('−1 credit')
  })

  it('shows a sign when asked (a real minus, not a hyphen)', () => {
    expect(credits(-500, { sign: true })).toBe('−500 credits')
    expect(credits(500, { sign: true })).toBe('+500 credits')
    expect(credits(0, { sign: true })).toBe('0 credits')
  })

  it('keeps a minus on a negative number even without the sign option', () => {
    expect(credits(-500)).toBe('−500 credits')
  })
})
