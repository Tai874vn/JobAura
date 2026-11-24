import type { ContractDetail, MilestoneView } from '@/shared/schemas'

/** Made-up contracts for the tests (not used by the app). */
export const ann = { id: 1, name: 'Ann Client', avatar: null }
export const bob = { id: 2, name: 'Bob Maker', avatar: null }
export const job = { id: 9, title: 'Logo design', image: null, price: 100 }
export const CLIENT = 1
export const FREELANCER = 2

export const milestoneOf = (position: number, status: MilestoneView['status'], over: Partial<MilestoneView> = {}): MilestoneView => ({
  id: 40 + position, position, title: `Step ${position}`, description: null, dueDate: '2030-01-10T16:59:00.000Z', amount: 500, status,
  fundedAt: null, submittedAt: null, changesRequestedAt: null, approvedAt: null, autoApproved: false,
  warnings: { late: false, silent: false, unfunded: false }, submissions: [], ...over,
})

export const contractOf = (milestones: MilestoneView[], over: Partial<ContractDetail> = {}): ContractDetail => ({
  id: 7, status: 'ACTIVE', endReason: null, imported: false, title: 'Logo', brief: 'A logo', referenceLinks: [], referenceImages: [],
  deadline: '2030-02-01T16:59:00.000Z', job, client: ann, freelancer: bob, proposalId: 3, total: 1000, paid: 0, held: 0, remaining: 1000,
  milestones, amendments: [], endRequest: null, review: null, canReview: false, graceMinutes: 4320, events: [], viewerRole: 'client',
  createdAt: '2030-01-01T00:00:00.000Z', completedAt: null, endedAt: null, ...over,
})

