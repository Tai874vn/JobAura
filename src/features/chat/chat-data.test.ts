import { describe, expect, it } from 'vitest'
import { parseOpenChatRequest, shouldLoadRoomMessages } from './chat-data'

describe('chat message loading', () => {
  it('loads history only for an active room that is not cached', () => {
    expect(shouldLoadRoomMessages(null, {})).toBe(false)
    expect(shouldLoadRoomMessages(7, {})).toBe(true)
    expect(shouldLoadRoomMessages(7, { 7: [] })).toBe(false)
  })
})

describe('parseOpenChatRequest', () => {
  it('reads a room id or a user id; the room wins', () => {
    expect(parseOpenChatRequest({ roomId: 4 })).toEqual({ roomId: 4 })
    expect(parseOpenChatRequest({ userId: 9 })).toEqual({ userId: 9 })
    expect(parseOpenChatRequest({ roomId: 4, userId: 9 })).toEqual({ roomId: 4 })
  })

  it('ignores anything that is not a positive whole number', () => {
    for (const detail of [null, undefined, 'x', {}, { userId: '9' }, { userId: 0 }, { roomId: 1.5 }]) {
      expect(parseOpenChatRequest(detail)).toBeNull()
    }
  })
})
