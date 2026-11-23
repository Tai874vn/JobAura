import { describe, expect, it } from 'vitest'
import type { AppNotification } from '@/shared/schemas'
import {
  notificationContext,
  notificationDetail,
  notificationHeadline,
  roomIdFromNotification,
  safeInternalActionUrl,
} from './notification-display'

function notification(overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id: 1,
    recipientId: 10,
    type: 'CHAT_MESSAGE',
    title: 'New message',
    body: 'Hello',
    readAt: null,
    createdAt: '2026-08-22T00:00:00.000Z',
    metadata: {},
    ...overrides,
  }
}

describe('notification display model', () => {
  it('accepts only internal action URLs', () => {
    expect(safeInternalActionUrl('/jobs/1?tab=details')).toBe('/jobs/1?tab=details')
    expect(safeInternalActionUrl('//evil.example/path')).toBeNull()
    expect(safeInternalActionUrl('/\\evil.example/path')).toBeNull()
    expect(safeInternalActionUrl('https://evil.example/path')).toBeNull()
  })

  it('reads numeric room identifiers from notification metadata', () => {
    expect(roomIdFromNotification(notification({ metadata: { roomId: '42' } }))).toBe(42)
    expect(roomIdFromNotification(notification({ metadata: { roomId: 'invalid' } }))).toBeNull()
  })

  it('builds an unread chat headline from actor and count', () => {
    expect(notificationHeadline(notification({
      actor: { id: 2, name: 'Alex' },
      metadata: { unreadCount: 3 },
    }))).toBe('3 new messages from Alex')
  })

  describe('hiring pipeline notifications', () => {
    const pipeline = (overrides: Partial<AppNotification>) => notification({
      metadata: { applicationId: 9, postId: 4 },
      actionUrl: '/my-hiring-posts/4/applicants?application=9',
      ...overrides,
    })

    it('says who applied for which post, read or not', () => {
      const received = pipeline({
        type: 'APPLICATION_RECEIVED', title: 'New applicant', body: 'Hai Vu applied for Senior Test Engineer.',
        actor: { id: 5, name: 'Hai Vu' },
        metadata: { applicationId: 9, postId: 4, postTitle: 'Senior Test Engineer', actorName: 'Hai Vu', kind: 'received' },
      })
      expect(notificationHeadline(received)).toBe('Hai Vu applied for Senior Test Engineer')
      expect(notificationHeadline({ ...received, readAt: '2026-11-23T00:00:00.000Z' })).toBe('Hai Vu applied for Senior Test Engineer')
      expect(notificationContext(received)).toBe('Applicant')
      // The headline already says it all, so the body is not repeated.
      expect(notificationDetail(received)).toBeNull()
    })

    it('falls back to the server title for an older notification without the new fields', () => {
      const old = pipeline({ type: 'APPLICATION_RECEIVED', title: 'New applicant', body: 'Hai Vu applied for Senior Test Engineer.', actor: { id: 5, name: 'Hai Vu' } })
      expect(notificationHeadline(old)).toBe('New applicant')
      expect(notificationDetail(old)).toBe('Hai Vu applied for Senior Test Engineer.')
    })

    it('uses the title of an application update, with the body as detail', () => {
      const update = pipeline({
        type: 'APPLICATION_UPDATE', title: 'Offer accepted', body: 'Hai Vu accepted the offer for Senior Test Engineer.',
        actor: { id: 5, name: 'Hai Vu' },
      })
      expect(notificationHeadline(update)).toBe('Offer accepted')
      expect(notificationContext(update)).toBe('Application')
      expect(notificationDetail(update)).toBe('Hai Vu accepted the offer for Senior Test Engineer.')
    })

    it('names the booked time in the viewer own time zone when the payload carries it', () => {
      const booked = pipeline({
        type: 'INTERVIEW_UPDATE', title: 'Interview booked', body: 'Hai Vu picked Tue 25 Nov 03:00 (Vietnam time) for the Senior Test Engineer interview.',
        metadata: { applicationId: 9, postId: 4, postTitle: 'Senior Test Engineer', actorName: 'Hai Vu', kind: 'interview', scheduledAt: new Date(2026, 10, 25, 10, 0).toISOString() },
      })
      expect(notificationHeadline(booked)).toBe('Interview booked for Wed 25 Nov, 10:00')
      expect(notificationContext(booked)).toBe('Interview')
    })

    it('keeps the title when no time is in the payload or it is not a date', () => {
      expect(notificationHeadline(pipeline({ type: 'INTERVIEW_UPDATE', title: 'Interview booked', body: 'x' }))).toBe('Interview booked')
      expect(notificationHeadline(pipeline({ type: 'INTERVIEW_UPDATE', title: 'Interview booked', body: 'x', metadata: { kind: 'interview', scheduledAt: 'soon' } }))).toBe('Interview booked')
      // New times or a request carry proposedTimes, not scheduledAt: the server title stays.
      expect(notificationHeadline(pipeline({ type: 'INTERVIEW_UPDATE', title: 'Interview request', body: 'x', metadata: { kind: 'interview', proposedTimes: [new Date().toISOString()] } }))).toBe('Interview request')
    })
  })
})
