import { describe, expect, it } from 'vitest'
import { normalizeHiringPost } from './hiring'

const raw = { id: 7, recruiterId: 2, title: 'QA', description: 'Test everything end to end.', status: 'CLOSED' }

describe('normalizeHiringPost', () => {
  it('keeps the viewer\'s own application, with its sweep reason', () => {
    const post = normalizeHiringPost({ ...raw, viewerHasApplied: true, viewerApplication: { id: 31, status: 'REJECTED', statusReason: 'POSITION_FILLED' } })
    expect(post.viewerApplication).toEqual({ id: 31, status: 'REJECTED', statusReason: 'POSITION_FILLED' })
    expect(normalizeHiringPost({ ...raw, viewerApplication: { id: 3, status: 'WITHDRAWN' } }).viewerApplication)
      .toEqual({ id: 3, status: 'WITHDRAWN', statusReason: null })
  })

  it('is null when the card has none or it is malformed', () => {
    expect(normalizeHiringPost(raw).viewerApplication).toBeNull()
    expect(normalizeHiringPost({ ...raw, viewerApplication: null }).viewerApplication).toBeNull()
    expect(normalizeHiringPost({ ...raw, viewerApplication: { id: 1, status: 'NOPE' } }).viewerApplication).toBeNull()
  })

  it('keeps openings, hired and waiting counts and the owner pipeline', () => {
    const pipeline = { APPLIED: 3, REVIEWING: 0, INTERVIEWING: 1, OFFERED: 1, HIRED: 1 }
    const post = normalizeHiringPost({ ...raw, openings: 2, hiredCount: 1, offersWaiting: 1, pipeline })
    expect(post).toMatchObject({ openings: 2, hiredCount: 1, offersWaiting: 1, pipeline })
    expect(normalizeHiringPost({ ...raw, openings: null }).openings).toBeNull()
  })
})
