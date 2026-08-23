import { describe, expect, it } from 'vitest'
import type { AppNotification } from '@/shared/schemas'
import {
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
})
