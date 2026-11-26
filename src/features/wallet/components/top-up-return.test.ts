import { describe, expect, it, vi } from 'vitest'
import { openCheckout } from '../api'
import { usdText } from '../utils/top-up-validation'
import { readReturnParams, topUpOutcome } from './top-up-return'

describe('readReturnParams', () => {
  it('reads the top up id and the result word from the return URL', () => {
    expect(readReturnParams('?topUp=7&result=success')).toEqual({ topUpId: 7, result: 'success' })
    expect(readReturnParams('?topUp=7&result=cancel')).toEqual({ topUpId: 7, result: 'cancel' })
  })

  it('ignores a bad id or an unknown result', () => {
    expect(readReturnParams('?topUp=abc&result=paid')).toEqual({ topUpId: null, result: null })
    expect(readReturnParams('?topUp=-1')).toEqual({ topUpId: null, result: null })
    expect(readReturnParams('')).toEqual({ topUpId: null, result: null })
  })
})

describe('topUpOutcome', () => {
  const pending = { status: 'PENDING' as const, credits: 50, available: 5000 }

  it('the server status wins over the URL result', () => {
    expect(topUpOutcome({ status: 'PAID', credits: 50, available: 5050 }, 'cancel').title).toMatch(/^Top up complete/)
    expect(topUpOutcome({ status: 'FAILED', credits: 50, available: 5000 }, 'success').title).toBe('Payment was not completed')
  })

  it('while PENDING, the words follow the way back from Stripe', () => {
    expect(topUpOutcome(pending, 'cancel').title).toBe('Payment cancelled')
    expect(topUpOutcome(pending, 'error').title).toBe('Payment was not completed')
    expect(topUpOutcome(pending, 'success', true).title).toBe('Waiting for Stripe to confirm')
    expect(topUpOutcome(pending, 'success', false).title).toBe('Still waiting for Stripe')
  })
})

describe('openCheckout', () => {
  it('goes to Stripe Checkout', () => {
    const go = vi.fn()
    openCheckout('https://checkout.stripe.com/c/pay/cs_test_1#abc', go)
    expect(go).toHaveBeenCalledWith('https://checkout.stripe.com/c/pay/cs_test_1#abc')
  })

  it('refuses any other address', () => {
    const go = vi.fn()
    expect(() => openCheckout('https://checkout.stripe.com.evil.example/x', go)).toThrow()
    expect(() => openCheckout('http://checkout.stripe.com/x', go)).toThrow()
    expect(go).not.toHaveBeenCalled()
  })
})

describe('usdText', () => {
  it('prices credits in US dollars (5 cents each)', () => {
    expect(usdText(10, 5)).toBe('$0.50')
    expect(usdText(1250, 5)).toBe('$62.50')
  })
})
