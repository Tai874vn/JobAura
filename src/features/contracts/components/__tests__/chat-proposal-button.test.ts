import { describe, expect, it } from 'vitest'
import type { Job } from '@/shared/schemas'
import { pricedServices } from '../chat-proposal-button'

describe('pricedServices', () => {
  it('keeps only services with a price, so portfolio posts cannot get a proposal', () => {
    const jobs = [{ id: 1, price: 0 }, { id: 2, price: 1250 }, { id: 3, price: 1 }] as Job[]
    expect(pricedServices(jobs).map((job) => job.id)).toEqual([2, 3])
    expect(pricedServices([])).toEqual([])
  })
})
