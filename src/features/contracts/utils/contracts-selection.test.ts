import { describe, expect, it } from 'vitest'
import { buildRows, hrefWith, expiresIn, listPlan, parsePageParams, resolveSelection, resolveTab } from './contracts-selection'

const p = (q: string) => parsePageParams(new URLSearchParams(q))

describe('parsePageParams', () => {
  it('defaults to no tab in the address, the All chip and nothing selected', () => {
    expect(p('')).toEqual({ tab: null, filter: 'all', selection: null })
  })
  it('reads tab, filter and the selected proposal', () => {
    expect(p('tab=freelancer&filter=ended&proposal=12')).toEqual({ tab: 'freelancer', filter: 'ended', selection: { kind: 'proposal', id: 12 } })
  })
  it('falls back on wrong values', () => {
    expect(p('tab=boss&filter=zzz&proposal=-3&contract=abc')).toEqual({ tab: null, filter: 'all', selection: null })
  })
  it('lets a contract win when both ids are given', () => {
    expect(p('proposal=4&contract=9').selection).toEqual({ kind: 'contract', id: 9 })
  })
})

describe('resolveTab', () => {
  it('prefers the address, then the side the viewer has on the opened item, then client', () => {
    expect(resolveTab('client', 'freelancer')).toBe('client')
    expect(resolveTab(null, 'freelancer')).toBe('freelancer')
    expect(resolveTab(null, undefined)).toBe('client')
  })
})

describe('listPlan', () => {
  it('asks for open proposals and every contract on All', () => {
    expect(listPlan('all')).toEqual({ proposals: 'OPEN', contracts: 'any' })
  })
  it('asks for one list on the other chips', () => {
    expect(listPlan('proposals')).toEqual({ proposals: 'any', contracts: null })
    expect(listPlan('active')).toEqual({ proposals: null, contracts: 'ACTIVE' })
    expect(listPlan('completed')).toEqual({ proposals: null, contracts: 'COMPLETED' })
    expect(listPlan('ended')).toEqual({ proposals: null, contracts: 'ENDED' })
  })
})

const prop = (id: number, updatedAt: string) => ({ id, updatedAt }) as never
const con = (id: number, updatedAt: string) => ({ id, updatedAt }) as never
const order = (rows: ReturnType<typeof buildRows>) => rows.map((r) => `${r.kind[0]}${r.id}`)

describe('buildRows', () => {
  const proposals = [prop(1, '2026-11-01'), prop(2, '2026-11-03')]
  const contracts = [con(1, '2026-11-05'), con(2, '2026-11-02')]
  it('puts open proposals before contracts on All, newest first inside each group', () => {
    expect(order(buildRows('all', proposals, contracts))).toEqual(['p2', 'p1', 'c1', 'c2'])
  })
  it('sorts one mixed list by last change on the other chips', () => {
    expect(order(buildRows('proposals', proposals, []))).toEqual(['p2', 'p1'])
    expect(order(buildRows('active', [], contracts))).toEqual(['c1', 'c2'])
  })
})

describe('resolveSelection', () => {
  const rows = buildRows('all', [prop(2, '2026-11-03')], [con(1, '2026-11-05')])
  it('uses the address first', () => {
    expect(resolveSelection({ kind: 'contract', id: 77 }, rows)).toEqual({ kind: 'contract', id: 77 })
  })
  it('falls back to the first row, or nothing', () => {
    expect(resolveSelection(null, rows)).toEqual({ kind: 'proposal', id: 2 })
    expect(resolveSelection(null, [])).toBeNull()
  })
})

describe('expiresIn', () => {
  const now = Date.parse('2026-11-24T12:00:00Z')
  it('says days, hours, under an hour and expired', () => {
    expect(expiresIn('2026-11-30T13:00:00Z', now)).toBe('in 6 days')
    expect(expiresIn('2026-11-25T13:00:00Z', now)).toBe('in 1 day')
    expect(expiresIn('2026-11-24T15:30:00Z', now)).toBe('in 3 hours')
    expect(expiresIn('2026-11-24T12:20:00Z', now)).toBe('in under an hour')
    expect(expiresIn('2026-11-24T11:00:00Z', now)).toBe('expired')
  })
})

describe('hrefWith', () => {
  it('sets and removes keys, and keeps the others', () => {
    expect(hrefWith('/contracts', 'tab=freelancer&contract=7', { contract: null, filter: 'active' })).toBe('/contracts?tab=freelancer&filter=active')
    expect(hrefWith('/contracts', 'contract=7', { contract: null })).toBe('/contracts')
  })
  it('writes the tab that came from the opened item, so Back and the chips keep it', () => {
    expect(hrefWith('/contracts', 'proposal=5', { proposal: null, contract: null, tab: 'freelancer' })).toBe('/contracts?tab=freelancer')
    expect(hrefWith('/contracts', 'proposal=5', { filter: 'ended', proposal: null, contract: null, tab: 'freelancer' })).toBe('/contracts?filter=ended&tab=freelancer')
  })
})
