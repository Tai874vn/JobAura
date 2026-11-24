import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient, uploadClient } from '@/shared/api/client'
import { contractDetailSchema, notificationTypes, proposalDetailSchema, jobSchema } from '@/shared/schemas'
import { walletApi } from '@/features/wallet/api'
import { contractKeys, contractsApi } from './api'

vi.mock('@/shared/api/client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
  uploadClient: { post: vi.fn() },
}))

const get = vi.mocked(apiClient.get)
const post = vi.mocked(apiClient.post)
const upload = vi.mocked(uploadClient.post)

const person = { id: 2, name: 'Mai', avatar: null }
const job = { id: 3, title: 'Logo design', image: null, price: 1250 }
const event = { id: 1, type: 'proposal_sent', data: { version: 1, total: 1250 }, actor: person, proposalId: 5, contractId: null, createdAt: '2026-11-24T01:00:00.000Z' }

const proposal = {
  id: 5, status: 'OPEN', job, client: person, freelancer: { id: 9, name: 'An', avatar: 'a.png' },
  latestVersion: 1, turnUserId: 9, expiresAt: '2026-12-01T01:00:00.000Z', declineNote: null, decidedAt: null,
  versions: [{
    id: 1, number: 1, authorId: 2, total: 1250, createdAt: '2026-11-24T01:00:00.000Z', brief: 'Make a logo',
    referenceLinks: [], referenceImages: [], deadline: '2026-12-20T16:59:00.000Z',
    milestones: [{ title: 'Draft', description: null, dueDate: '2026-12-10T16:59:00.000Z', amount: 1250 }],
  }],
  contractId: null, viewerRole: 'client', events: [event],
  createdAt: '2026-11-24T01:00:00.000Z', updatedAt: '2026-11-24T01:00:00.000Z',
}

const contract = {
  id: 8, status: 'ACTIVE', endReason: null, imported: false, title: 'Logo design', brief: 'Make a logo',
  referenceLinks: [], referenceImages: [], deadline: '2026-12-20T16:59:00.000Z', job, client: person,
  freelancer: { id: 9, name: 'An', avatar: null }, proposalId: 5, total: 1250, paid: 0, held: 0, remaining: 1250,
  milestones: [{
    id: 11, position: 1, title: 'Draft', description: null, dueDate: '2026-12-10T16:59:00.000Z', amount: 1250,
    status: 'PENDING', fundedAt: null, submittedAt: null, changesRequestedAt: null, approvedAt: null,
    autoApproved: false, warnings: { late: false, silent: false, unfunded: false }, submissions: [],
  }],
  amendments: [{
    id: 1, status: 'OPEN', proposerId: 2, note: null, deadline: null, declineNote: null,
    createdAt: '2026-11-24T02:00:00.000Z', decidedAt: null,
    changes: [{ op: 'move', milestoneId: 11, dueDate: '2026-12-12T16:59:00.000Z' }, { op: 'amount', milestoneId: 11, amount: 1000 }],
  }],
  endRequest: null, review: null, canReview: false, graceMinutes: 4320,
  events: [{ ...event, type: 'contract_started', data: {}, contractId: 8 }],
  viewerRole: 'client', createdAt: '2026-11-24T01:00:00.000Z', completedAt: null, endedAt: null,
}

const page = <T>(data: T[]) => ({ data: { message: 'ok', content: { data, total: data.length, page: 1, pageSize: 20, totalPages: 1 } } })
const wrap = <T>(content: T) => ({ data: { message: 'ok', content } })

beforeEach(() => {
  get.mockReset()
  post.mockReset()
  upload.mockReset()
})

describe('schemas', () => {
  it('parses a backend ContractDetail with review and endRequest null', () => {
    const parsed = contractDetailSchema.parse(contract)
    expect(parsed.review).toBeNull()
    expect(parsed.endRequest).toBeNull()
    expect(parsed.milestones[0].warnings.late).toBe(false)
  })

  it('parses a backend ProposalDetail', () => {
    const parsed = proposalDetailSchema.parse(proposal)
    expect(parsed.versions[0].milestones[0].amount).toBe(1250)
    expect(parsed.events[0].type).toBe('proposal_sent')
  })

  it('rejects a contract with a wrong status', () => {
    expect(() => contractDetailSchema.parse({ ...contract, status: 'HIRED' })).toThrow()
  })

  it('knows the two new notification types and the new job fields', () => {
    expect(notificationTypes).toEqual(expect.arrayContaining(['PROPOSAL_UPDATE', 'CONTRACT_UPDATE']))
    const parsed = jobSchema.parse({ id: 1, title: 'x', price: 5, workMode: 'BOTH', serviceArea: 'Hanoi', milestoneTemplate: [{ title: 'A', share: 100 }] })
    expect(parsed.workMode).toBe('BOTH')
  })
})

describe('contractsApi', () => {
  it('lists proposals with the side and parses the page', async () => {
    get.mockResolvedValue(page([{
      id: 5, status: 'OPEN', job, client: person, freelancer: person, latestVersion: 1, turnUserId: 9, total: 1250,
      deadline: '2026-12-20T16:59:00.000Z', expiresAt: '2026-12-01T01:00:00.000Z', updatedAt: '2026-11-24T01:00:00.000Z', viewerRole: 'client',
    }]) as never)
    const result = await contractsApi.proposals({ role: 'client', page: 1, pageSize: 20 })
    expect(get).toHaveBeenCalledWith('/api/proposals', { params: { role: 'client', page: 1, pageSize: 20 } })
    expect(result.data[0].total).toBe(1250)
    expect(result.totalPages).toBe(1)
  })

  it('reads one proposal and one contract', async () => {
    get.mockResolvedValueOnce(wrap(proposal) as never).mockResolvedValueOnce(wrap(contract) as never)
    expect((await contractsApi.proposal(5)).id).toBe(5)
    expect((await contractsApi.contract(8)).id).toBe(8)
    expect(get).toHaveBeenNthCalledWith(1, '/api/proposals/5')
    expect(get).toHaveBeenNthCalledWith(2, '/api/contracts/8')
  })

  it('lists contracts with a status filter', async () => {
    get.mockResolvedValue(page([]) as never)
    await contractsApi.contracts({ role: 'freelancer', status: 'ACTIVE', page: 2, pageSize: 10 })
    expect(get).toHaveBeenCalledWith('/api/contracts', { params: { role: 'freelancer', status: 'ACTIVE', page: 2, pageSize: 10 } })
  })

  it('sends the proposal actions to the backend paths and parses the proposal', async () => {
    post.mockResolvedValue(wrap(proposal) as never)
    const body = { brief: 'b', referenceLinks: [], referenceImages: [], deadline: '2026-12-20T16:59:00.000Z', milestones: [] }
    await contractsApi.propose({ ...body, jobId: 3 })
    await contractsApi.counter(5, body)
    await contractsApi.accept(5, 2)
    await contractsApi.decline(5, 'no')
    await contractsApi.decline(5)
    await contractsApi.withdrawProposal(5)
    expect(post.mock.calls).toEqual([
      ['/api/proposals', { ...body, jobId: 3 }],
      ['/api/proposals/5/counter', body],
      ['/api/proposals/5/accept', { version: 2 }],
      ['/api/proposals/5/decline', { note: 'no' }],
      ['/api/proposals/5/decline', {}],
      ['/api/proposals/5/withdraw'],
    ])
  })

  it('sends the milestone actions and parses the contract', async () => {
    post.mockResolvedValue(wrap(contract) as never)
    const result = await contractsApi.fund(11)
    await contractsApi.submit(11, { note: 'done', images: [], links: ['https://a.b'] })
    await contractsApi.requestChanges(11, 'fix')
    await contractsApi.approve(11)
    await contractsApi.endNow(8)
    expect(result.id).toBe(8)
    expect(post.mock.calls).toEqual([
      ['/api/milestones/11/fund'],
      ['/api/milestones/11/submit', { note: 'done', images: [], links: ['https://a.b'] }],
      ['/api/milestones/11/request-changes', { note: 'fix' }],
      ['/api/milestones/11/approve'],
      ['/api/contracts/8/end'],
    ])
  })

  it('sends the amendment and end-request actions', async () => {
    post.mockResolvedValue(wrap(contract) as never)
    await contractsApi.proposeAmendment(8, { changes: [{ op: 'amount', milestoneId: 11, amount: 900 }] })
    await contractsApi.acceptAmendment(1)
    await contractsApi.declineAmendment(1, 'no')
    await contractsApi.withdrawAmendment(1)
    await contractsApi.requestEnd(8, { note: 'stop', submittedChoice: 'REFUND' })
    await contractsApi.acceptEnd(8, 'APPROVE')
    await contractsApi.acceptEnd(8)
    await contractsApi.declineEnd(8)
    await contractsApi.withdrawEnd(8)
    expect(post.mock.calls).toEqual([
      ['/api/contracts/8/amendments', { changes: [{ op: 'amount', milestoneId: 11, amount: 900 }] }],
      ['/api/amendments/1/accept'],
      ['/api/amendments/1/decline', { note: 'no' }],
      ['/api/amendments/1/withdraw'],
      ['/api/contracts/8/end-requests', { note: 'stop', submittedChoice: 'REFUND' }],
      ['/api/contracts/8/end-requests/accept', { submittedChoice: 'APPROVE' }],
      ['/api/contracts/8/end-requests/accept', {}],
      ['/api/contracts/8/end-requests/decline'],
      ['/api/contracts/8/end-requests/withdraw'],
    ])
  })

  it('uploads one image as multipart field "file" and returns its url', async () => {
    upload.mockResolvedValue(wrap({ url: 'https://res.cloudinary.com/x.png' }) as never)
    const file = new File([new Uint8Array(10)], 'a.png', { type: 'image/png' })
    const result = await contractsApi.uploadImage(file)
    expect(result).toEqual({ url: 'https://res.cloudinary.com/x.png' })
    const [path, form] = upload.mock.calls[0]
    expect(path).toBe('/api/contracts/attachments')
    expect((form as FormData).get('file')).toBeInstanceOf(File)
  })

  it('posts a review with the contract id', async () => {
    post.mockResolvedValue(wrap({ id: 1 }) as never)
    await contractsApi.review({ contractId: 8, content: 'Great', rating: 5 })
    expect(post).toHaveBeenCalledWith('/api/comments', { contractId: 8, content: 'Great', rating: 5 })
  })

  it('throws when the backend sends a wrong shape', async () => {
    post.mockResolvedValue(wrap({ id: 8 }) as never)
    await expect(contractsApi.fund(11)).rejects.toThrow()
  })
})

describe('walletApi', () => {
  it('reads the summary and a ledger page', async () => {
    const summary = { available: 5000, held: 0, paidOut: 0, earned: 0, topUp: { enabled: false, minCredits: 10, maxCredits: 10000, vndPerCredit: 1000 } }
    get.mockResolvedValueOnce(wrap(summary) as never).mockResolvedValueOnce(page([{
      id: 1, type: 'SEED', availableDelta: 5000, heldDelta: 0, availableAfter: 5000, heldAfter: 0, contract: null,
      milestone: null, counterparty: null, topUpId: null, createdAt: '2026-11-24T01:00:00.000Z',
    }]) as never)
    expect((await walletApi.summary()).available).toBe(5000)
    const ledger = await walletApi.ledger({ page: 1, pageSize: 20 })
    expect(ledger.data[0].type).toBe('SEED')
    expect(get).toHaveBeenNthCalledWith(1, '/api/wallet')
    expect(get).toHaveBeenNthCalledWith(2, '/api/wallet/ledger', { params: { page: 1, pageSize: 20 } })
  })

  it('starts a top up and passes the VNPay query string through unchanged', async () => {
    post.mockResolvedValue(wrap({ topUpId: 4, payUrl: 'https://pay.example/x' }) as never)
    expect(await walletApi.startTopUp(100)).toEqual({ topUpId: 4, payUrl: 'https://pay.example/x' })
    expect(post).toHaveBeenCalledWith('/api/wallet/top-ups', { credits: 100 })

    get.mockResolvedValue(wrap({ status: 'PAID', credits: 100, available: 5100 }) as never)
    const query = '?vnp_Amount=10000000&vnp_SecureHash=a%2Bb'
    expect((await walletApi.topUpReturn(query)).status).toBe('PAID')
    expect(get).toHaveBeenCalledWith('/api/wallet/top-ups/vnpay-return?vnp_Amount=10000000&vnp_SecureHash=a%2Bb')
  })
})

describe('contractKeys', () => {
  it('carries the viewer and id or the side so one person never reads the cache of another', () => {
    expect(contractKeys.proposal(5, 1)).toEqual(['contracts', 'proposal', 1, 5])
    expect(contractKeys.contract(8, 1)).toEqual(['contracts', 'contract', 1, 8])
    expect(contractKeys.contracts({ role: 'client', page: 1 })).toEqual(['contracts', 'list', { role: 'client', page: 1 }])
    expect(contractKeys.proposals({ role: 'freelancer' })).toEqual(['contracts', 'proposal' + 's', { role: 'freelancer' }])
  })
})
