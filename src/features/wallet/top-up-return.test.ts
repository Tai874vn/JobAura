import { describe, expect, it, vi } from 'vitest'
import { submitCheckoutForm } from './api'
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

  it('while PENDING, the words follow the way back from SePay', () => {
    expect(topUpOutcome(pending, 'cancel').title).toBe('Payment cancelled')
    expect(topUpOutcome(pending, 'error').title).toBe('Payment was not completed')
    expect(topUpOutcome(pending, 'success', true).title).toBe('Waiting for SePay to confirm')
    expect(topUpOutcome(pending, 'success', false).title).toBe('Still waiting for SePay')
  })
})

describe('submitCheckoutForm', () => {
  function fakeDocument() {
    const inputs: Array<Record<string, string>> = []
    const form = {
      method: '',
      action: '',
      style: {} as Record<string, string>,
      appendChild: (input: Record<string, string>) => inputs.push(input),
      submit: vi.fn(),
    }
    const doc = {
      createElement: (tag: string) => (tag === 'form' ? form : ({} as Record<string, string>)),
      body: { appendChild: vi.fn() },
    }
    return { doc: doc as unknown as Document, form, inputs }
  }

  it('posts every signed field, in order, to the SePay checkout', () => {
    const { doc, form, inputs } = fakeDocument()
    submitCheckoutForm(
      { action: 'https://pay-sandbox.sepay.vn/v1/checkout/init', fields: { order_amount: '50000', merchant: 'M', signature: 'S' } },
      doc,
    )
    expect(form.method).toBe('POST')
    expect(form.action).toBe('https://pay-sandbox.sepay.vn/v1/checkout/init')
    expect(inputs.map((i) => [i.type, i.name, i.value])).toEqual([
      ['hidden', 'order_amount', '50000'],
      ['hidden', 'merchant', 'M'],
      ['hidden', 'signature', 'S'],
    ])
    expect(form.submit).toHaveBeenCalledTimes(1)
  })

  it('refuses to post anywhere else', () => {
    const { doc, form } = fakeDocument()
    expect(() => submitCheckoutForm({ action: 'https://evil.example/init', fields: {} }, doc)).toThrow()
    expect(form.submit).not.toHaveBeenCalled()
  })
})
