import { beforeEach, describe, expect, it, vi } from 'vitest'
import { applicationDetailSchema, hiringApplicationStatusSchema, notificationTypes } from '@/shared/schemas'
import { normalizeHiringApplication } from '@/shared/api/normalizers'
import { apiClient } from '@/shared/api/client'
import { pipelineApi, pipelineKeys, statusLabel, trackerStep } from './api'

vi.mock('@/shared/api/client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}))

const get = vi.mocked(apiClient.get)
const post = vi.mocked(apiClient.post)

const sample = {
  id: 7,
  hiringPostId: 3,
  applicantId: 9,
  coverLetter: null,
  status: 'OFFERED',
  statusReason: null,
  statusNote: null,
  offerNote: 'Welcome',
  offeredAt: '2026-11-23T01:00:00.000Z',
  decidedAt: null,
  createdAt: '2026-11-20T01:00:00.000Z',
  updatedAt: '2026-11-23T01:00:00.000Z',
  hiringPost: {
    id: 3, recruiterId: 2, title: 'Nurse', description: 'Care for patients in a ward.', status: 'OPEN',
    openings: null, hiredCount: 1, offersWaiting: 1, applicationCount: 4, viewerHasApplied: true,
  },
  applicant: { id: 9, name: 'Mai', avatar: null, headline: null, location: 'Hanoi', profileSkills: [] },
  resume: null,
  interviews: [{
    id: 1, round: 1, mode: 'ONLINE', durationMinutes: 45, location: null, note: null,
    proposedTimes: ['2026-11-25T03:00:00.000Z'], scheduledAt: '2026-11-25T03:00:00.000Z', status: 'COMPLETED',
    rescheduleNote: null, completedAt: '2026-11-25T04:00:00.000Z', cancelledAt: null,
  }],
  events: [{ id: 1, type: 'rejected', data: { reason: 'POSITION_FILLED' }, createdAt: '2026-11-21T01:00:00.000Z', actor: null }],
  viewerRole: 'candidate',
}

const statuses = hiringApplicationStatusSchema.options

describe('statusLabel', () => {
  it('uses the agreed words for every status and both viewers', () => {
    const words = {
      APPLIED: 'New', REVIEWING: 'Shortlisted', INTERVIEWING: 'Interview', HIRED: 'Hired',
      REJECTED: 'Not selected', DECLINED: 'Offer declined', WITHDRAWN: 'Withdrawn',
    } as const
    for (const status of statuses) {
      if (status === 'OFFERED') continue
      expect(statusLabel(status, 'recruiter')).toBe(words[status])
      expect(statusLabel(status, 'candidate')).toBe(words[status])
    }
    expect(statusLabel('OFFERED', 'recruiter')).toBe('Offer sent')
    expect(statusLabel('OFFERED', 'candidate')).toBe('Offer received')
  })

  it('names the sweep reason under Not selected', () => {
    expect(statusLabel('REJECTED', 'candidate', 'POSITION_FILLED')).toBe('Position filled')
    expect(statusLabel('REJECTED', 'recruiter', 'POST_CLOSED')).toBe('Post closed')
    expect(statusLabel('REJECTED', 'candidate', null)).toBe('Not selected')
    expect(statusLabel('REJECTED', 'candidate', 'SOMETHING_NEW')).toBe('Not selected')
  })

  it('ignores a reason on a status that is not rejected', () => {
    expect(statusLabel('APPLIED', 'candidate', 'POST_CLOSED')).toBe('New')
  })
})

describe('trackerStep', () => {
  it('maps each status to Applied, Shortlisted, Interview, Offer, Hired', () => {
    expect(trackerStep('APPLIED')).toBe(0)
    expect(trackerStep('REVIEWING')).toBe(1)
    expect(trackerStep('INTERVIEWING')).toBe(2)
    expect(trackerStep('OFFERED')).toBe(3)
    expect(trackerStep('HIRED')).toBe(4)
  })

  it('puts final statuses that are not hired at the start of the tracker', () => {
    expect(trackerStep('REJECTED')).toBe(0)
    expect(trackerStep('DECLINED')).toBe(3)
    expect(trackerStep('WITHDRAWN')).toBe(0)
  })
})

describe('schemas', () => {
  it('parses a backend ApplicationDetail with resume null', () => {
    const parsed = applicationDetailSchema.parse(sample)
    expect(parsed.resume).toBeNull()
    expect(parsed.hiringPost?.openings).toBeNull()
    expect(parsed.interviews[0].status).toBe('COMPLETED')
    expect(parsed.events[0].data).toEqual({ reason: 'POSITION_FILLED' })
  })

  it('parses a list card that has no interviews or events', () => {
    const { interviews, events, ...card } = sample
    void interviews; void events
    const parsed = applicationDetailSchema.parse(card)
    expect(parsed.interviews).toEqual([])
    expect(parsed.events).toEqual([])
  })

  it('knows the new notification types', () => {
    expect(notificationTypes).toEqual(expect.arrayContaining(['APPLICATION_RECEIVED', 'APPLICATION_UPDATE', 'INTERVIEW_UPDATE']))
  })

  it('keeps HIRED when the normalizer reads an application', () => {
    expect(normalizeHiringApplication({ id: 1, status: 'HIRED', statusReason: 'POST_CLOSED' })).toMatchObject({
      status: 'HIRED', statusReason: 'POST_CLOSED',
    })
  })
})

describe('pipelineKeys', () => {
  it('carries the id in every key', () => {
    expect(pipelineKeys.detail(4)).toEqual(['pipeline', 'application', 4])
    expect(pipelineKeys.list(2, { page: 1 })).toEqual(['pipeline', 'post', 2, { page: 1 }])
    expect(pipelineKeys.mine({ page: 1 })).toEqual(['pipeline', 'mine', { page: 1 }])
    expect(pipelineKeys.upcoming).toEqual(['pipeline', 'upcoming'])
  })
})

describe('pipelineApi', () => {
  beforeEach(() => { get.mockReset(); post.mockReset() })

  it('reads the detail and unwraps content', async () => {
    get.mockResolvedValue({ data: { message: 'ok', content: sample } })
    const detail = await pipelineApi.detail(7)
    expect(get).toHaveBeenCalledWith('/api/applications/7')
    expect(detail.id).toBe(7)
  })

  it('lists applicants with the status filter and the counts', async () => {
    const counts = Object.fromEntries(statuses.map((s) => [s, 0]))
    get.mockResolvedValue({ data: { content: { data: [sample], total: 1, totalPages: 1, counts } } })
    const result = await pipelineApi.list(3, { status: 'OFFERED', page: 2, pageSize: 10 })
    expect(get).toHaveBeenCalledWith('/api/hiring-posts/3/applications', { params: { status: 'OFFERED', page: 2, pageSize: 10 } })
    expect(result.data).toHaveLength(1)
    expect(result.counts.HIRED).toBe(0)
    expect(result.totalPages).toBe(1)
  })

  it('leaves the status out when none is chosen, and fills missing counts with 0', async () => {
    get.mockResolvedValue({ data: { content: { data: [], counts: { APPLIED: 2 } } } })
    const result = await pipelineApi.list(3, { page: 1, pageSize: 10 })
    expect(get).toHaveBeenCalledWith('/api/hiring-posts/3/applications', { params: { page: 1, pageSize: 10 } })
    expect(result.counts.APPLIED).toBe(2)
    expect(result.counts.DECLINED).toBe(0)
    expect(result.totalPages).toBe(1)
  })

  it('reads my applications as a page', async () => {
    get.mockResolvedValue({ data: { content: { data: [sample], total: 1, totalPages: 1 } } })
    const page = await pipelineApi.mine({ page: 1, pageSize: 10 })
    expect(get).toHaveBeenCalledWith('/api/hiring-posts/applications/me', { params: { page: 1, pageSize: 10 } })
    expect(page.data[0].status).toBe('OFFERED')
    expect(page.totalPages).toBe(1)
  })

  it('sends the actions to the right paths', async () => {
    post.mockResolvedValue({ data: { content: sample } })
    await pipelineApi.shortlist(7)
    await pipelineApi.reject(7, 'No fit')
    await pipelineApi.offer(7)
    await pipelineApi.withdrawOffer(7)
    await pipelineApi.acceptOffer(7)
    await pipelineApi.declineOffer(7, 'Other job')
    await pipelineApi.withdraw(7)
    expect(post.mock.calls).toEqual([
      ['/api/applications/7/shortlist'],
      ['/api/applications/7/reject', { note: 'No fit' }],
      ['/api/applications/7/offer', {}],
      ['/api/applications/7/offer/withdraw'],
      ['/api/applications/7/offer/accept'],
      ['/api/applications/7/offer/decline', { note: 'Other job' }],
      ['/api/applications/7/withdraw'],
    ])
  })

  it('sends the interview actions to the right paths', async () => {
    post.mockResolvedValue({ data: { content: sample } })
    await pipelineApi.requestInterview(7, { mode: 'ONLINE', proposedTimes: ['2026-11-25T03:00:00.000Z'] })
    await pipelineApi.proposeTimes(1, ['2026-11-26T03:00:00.000Z'])
    await pipelineApi.pickTime(1, '2026-11-26T03:00:00.000Z')
    await pipelineApi.askOtherTimes(1, 'Busy')
    await pipelineApi.cancelInterview(1)
    await pipelineApi.completeInterview(1)
    expect(post.mock.calls).toEqual([
      ['/api/applications/7/interviews', { mode: 'ONLINE', proposedTimes: ['2026-11-25T03:00:00.000Z'] }],
      ['/api/interviews/1/times', { proposedTimes: ['2026-11-26T03:00:00.000Z'] }],
      ['/api/interviews/1/accept', { startsAt: '2026-11-26T03:00:00.000Z' }],
      ['/api/interviews/1/reschedule', { note: 'Busy' }],
      ['/api/interviews/1/cancel', {}],
      ['/api/interviews/1/complete'],
    ])
  })

  it('reads upcoming interviews', async () => {
    const item = {
      ...sample.interviews[0], status: 'SCHEDULED', applicationId: 7,
      post: { id: 3, title: 'Nurse', companyName: null }, otherPerson: { id: 2, name: 'Lan', avatar: null }, viewerRole: 'candidate',
    }
    get.mockResolvedValue({ data: { content: [item] } })
    const list = await pipelineApi.upcoming()
    expect(get).toHaveBeenCalledWith('/api/interviews/upcoming')
    expect(list[0].otherPerson.name).toBe('Lan')
  })

  it('gets a call token without a wrapper', async () => {
    const token = { url: 'wss://x', token: 't', roomName: 'jobaura-interview-1', expiresAt: '2026-11-25T05:00:00.000Z' }
    post.mockResolvedValue({ data: token })
    expect(await pipelineApi.callToken(1)).toEqual(token)
    expect(post).toHaveBeenCalledWith('/api/interviews/1/call-token')
  })
})
