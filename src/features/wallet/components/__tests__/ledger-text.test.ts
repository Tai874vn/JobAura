import { describe, expect, it } from 'vitest'
import type { LedgerEntryView } from '@/shared/schemas'
import { ledgerAmount, ledgerText } from '../wallet-page'

const entry = (over: Partial<LedgerEntryView>): LedgerEntryView => ({
  id: 1, type: 'SEED', availableDelta: 0, heldDelta: 0, availableAfter: 0, heldAfter: 0, contract: null, milestone: null,
  counterparty: null, topUpId: null, createdAt: '2026-11-20T09:00:00.000Z', ...over,
})
const contract = { id: 7, title: 'Logo design' }
const milestone = { id: 40, position: 2, title: 'Sketch' }
const bob = { id: 2, name: 'Bob Maker', avatar: null }

describe('ledgerText', () => {
  it('names the starting credits and a top up', () => {
    expect(ledgerText(entry({ type: 'SEED' }))).toBe('Starting credits')
    expect(ledgerText(entry({ type: 'TOP_UP' }))).toBe('Top up')
  })
  it('names the milestone and the contract when credits are held', () => {
    expect(ledgerText(entry({ type: 'FUND_HOLD', contract, milestone }))).toBe('Held for milestone 2 · Logo design')
  })
  it('reads a release from the payer side as paid and from the earner side as earned', () => {
    // The payer's row: available does not move, held goes down.
    expect(ledgerText(entry({ type: 'RELEASE', contract, milestone, counterparty: bob, heldDelta: -400 }))).toBe('Paid to Bob Maker for milestone 2')
    // The earner's row: available goes up.
    expect(ledgerText(entry({ type: 'RELEASE', contract, milestone, counterparty: bob, availableDelta: 400 }))).toBe('Earned from Bob Maker for milestone 2')
  })
  it('names a refund', () => {
    expect(ledgerText(entry({ type: 'REFUND', contract, milestone }))).toBe('Refund for milestone 2')
  })
  it('still reads well when the contract or person is missing', () => {
    expect(ledgerText(entry({ type: 'FUND_HOLD' }))).toBe('Held for a milestone')
    expect(ledgerText(entry({ type: 'RELEASE', availableDelta: 5 }))).toBe('Earned for a milestone')
    expect(ledgerText(entry({ type: 'REFUND' }))).toBe('Refund')
  })
})

describe('ledgerAmount', () => {
  it('shows the available change when it is not zero, else the held change', () => {
    expect(ledgerAmount(entry({ availableDelta: 5000 }))).toBe('+5,000 credits')
    expect(ledgerAmount(entry({ availableDelta: -400, heldDelta: 400 }))).toBe('−400 credits')
    expect(ledgerAmount(entry({ heldDelta: -400 }))).toBe('−400 credits')
  })
})
