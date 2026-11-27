import { describe, expect, it, vi } from 'vitest'
import { getErrorMessage } from '@/shared/lib/utils'
import { openCheckout } from '../../api'
import { parseTopUpAmount, startTopUpAndRedirect, topUpErrors } from '../top-up-dialog'

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

describe('startTopUpAndRedirect', () => {
  it('turns an unexpected checkout URL into a safe inline error message instead of throwing a raw error', async () => {
    const fakeStart = vi.fn().mockResolvedValue({ topUpId: 1, checkoutUrl: 'https://evil.example/pay' })
    const err = await startTopUpAndRedirect(100, fakeStart, openCheckout).catch((e: unknown) => e)
    expect(getErrorMessage(err)).toBe('Could not open the payment page. Please try again.')
  })

  it('redirects when the checkout URL is a valid Stripe Checkout URL', async () => {
    const fakeStart = vi.fn().mockResolvedValue({ topUpId: 2, checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_123' })
    const go = vi.fn()
    await startTopUpAndRedirect(100, fakeStart, (url) => openCheckout(url, go))
    expect(go).toHaveBeenCalledWith('https://checkout.stripe.com/c/pay/cs_test_123')
  })
})
