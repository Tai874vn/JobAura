import { describe, expect, it } from 'vitest'
import type { ProposalVersionView } from '@/shared/schemas'
import { describeVersionChange } from '../proposal-panel'

const version = (over: Record<string, unknown> = {}) => ({
  id: 1, number: 1, authorId: 1, total: 100, createdAt: '2026-11-01T00:00:00Z', brief: 'Make a logo', referenceLinks: [], referenceImages: [],
  deadline: '2026-12-10T16:59:00Z',
  milestones: [
    { title: 'Sketch', description: null, dueDate: '2026-12-01T16:59:00Z', amount: 40 },
    { title: 'Final', description: null, dueDate: '2026-12-10T16:59:00Z', amount: 60 },
  ],
  ...over,
}) as unknown as ProposalVersionView

describe('describeVersionChange', () => {
  it('says nothing for the first version or an identical one', () => {
    expect(describeVersionChange(undefined, version())).toEqual([])
    expect(describeVersionChange(version(), version({ number: 2 }))).toEqual([])
  })
  it('names the total and the milestone amount that changed, in credits', () => {
    const next = version({
      total: 1250,
      milestones: [
        { title: 'Sketch', description: null, dueDate: '2026-12-01T16:59:00Z', amount: 1190 },
        { title: 'Final', description: null, dueDate: '2026-12-10T16:59:00Z', amount: 60 },
      ],
    })
    expect(describeVersionChange(version(), next)).toEqual(['Total 100 credits to 1,250 credits', 'Milestone 1: 40 credits to 1,190 credits'])
  })
  it('names a new brief, new references and a different number of milestones', () => {
    const next = version({ brief: 'Make two logos', referenceLinks: ['https://x.test'], milestones: [version().milestones[0]] })
    expect(describeVersionChange(version(), next)).toEqual(['Brief changed', 'References changed', '2 milestones to 1 milestone'])
  })
})
