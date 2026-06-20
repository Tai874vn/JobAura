import { describe, expect, it } from 'vitest'
import { shouldLoadRoomMessages } from './chat-data'

describe('chat message loading', () => {
  it('loads history only for an active room that is not cached', () => {
    expect(shouldLoadRoomMessages(null, {})).toBe(false)
    expect(shouldLoadRoomMessages(7, {})).toBe(true)
    expect(shouldLoadRoomMessages(7, { 7: [] })).toBe(false)
  })
})
