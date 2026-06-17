import { beforeEach, describe, expect, it } from 'vitest'
import { useChatStore } from './chat-store'

describe('chat store', () => {
  beforeEach(() => {
    useChatStore.getState().reset()
  })

  it('opens and closes chat session', () => {
    useChatStore.getState().openChat()
    expect(useChatStore.getState().isOpen).toBe(true)
    expect(useChatStore.getState().isSocketActive).toBe(true)

    useChatStore.getState().closeChat()
    expect(useChatStore.getState().isOpen).toBe(false)
    expect(useChatStore.getState().isSocketActive).toBe(true)
  })

  it('stores room messages and increments unread count on new message', () => {
    useChatStore.getState().setRooms([
      {
        id: 1,
        name: 'General',
        isGroup: false,
        members: [],
        unreadCount: 0,
      },
    ])

    useChatStore.getState().setMessages(1, [
      {
        id: 100,
        roomId: 1,
        content: 'hello',
        createdAt: '2025-01-01T00:00:00.000Z',
        sender: { id: 9, name: 'A', email: 'a@example.com', avatar: null },
      },
    ])

    useChatStore.getState().addMessage({
      id: 101,
      roomId: 1,
      content: 'new message',
      createdAt: '2025-01-01T00:01:00.000Z',
      sender: { id: 10, name: 'B', email: 'b@example.com', avatar: null },
    })

    const state = useChatStore.getState()
    expect(state.messagesByRoom[1]).toHaveLength(2)
    expect(state.rooms[0].unreadCount).toBe(1)
    expect(state.rooms[0].lastMessage?.id).toBe(101)
  })

  it('opens chat for a room without duplicating existing rooms', () => {
    const room = {
      id: 1,
      name: 'Lina',
      isGroup: false,
      members: [],
      unreadCount: 0,
    }

    useChatStore.getState().openChatForRoom(room)
    useChatStore.getState().openChatForRoom({ ...room, name: 'Lina Tran' })

    const state = useChatStore.getState()
    expect(state.isOpen).toBe(true)
    expect(state.isSocketActive).toBe(true)
    expect(state.activeRoomId).toBe(1)
    expect(state.rooms).toEqual([{ ...room, name: 'Lina Tran' }])
  })

  it('resets full state', () => {
    useChatStore.getState().openChat()
    useChatStore.getState().setOnlineUserIds([1, 2])
    useChatStore.getState().setTypingUsers([{ userId: 1, roomId: 1, name: 'User' }])

    useChatStore.getState().reset()
    const state = useChatStore.getState()
    expect(state).toMatchObject({
      isOpen: false,
      isSocketActive: false,
      rooms: [],
      activeRoomId: null,
      messagesByRoom: {},
      onlineUserIds: [],
      typingUsers: [],
    })
  })
})
