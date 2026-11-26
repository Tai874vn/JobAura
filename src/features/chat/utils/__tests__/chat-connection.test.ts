import { QueryClient } from '@tanstack/react-query'
import { Manager } from 'socket.io-client'
import { describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/shared/api/query-keys'
import type { ChatMessage } from '@/shared/schemas'
import {
  createChatConnectHandler,
  handleIncomingChatMessage,
  synchronizeChatConnection,
} from '../chat-connection'

const sampleMessage: ChatMessage = {
  id: 101,
  roomId: 9,
  content: 'Hello while you were away',
  createdAt: '2026-11-25T10:00:00.000Z',
  sender: { id: 2, name: 'Bob', email: 'bob@example.com', avatar: null },
}

describe('chat connection synchronization', () => {
  it('joins and marks the selected room read when the socket connects after room selection', () => {
    const socket = new Manager('https://api.example.com', { autoConnect: false }).socket('/chat')

    synchronizeChatConnection(socket, 7)

    expect(socket.sendBuffer.map((packet) => packet.data)).toEqual([
      ['get-online-users'],
      ['join-room', { roomId: 7 }],
      ['mark-as-read', { roomId: 7 }],
    ])
  })

  it('requests presence without joining a room when no conversation is selected', () => {
    const socket = new Manager('https://api.example.com', { autoConnect: false }).socket('/chat')

    synchronizeChatConnection(socket, null)

    expect(socket.sendBuffer.map((packet) => packet.data)).toEqual([['get-online-users']])
  })

  it('invalidates rooms and active room messages on reconnect, but not on the initial connect', () => {
    const socket = new Manager('https://api.example.com', { autoConnect: false }).socket('/chat')
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    let activeRoomId: number | null = 7

    const onConnect = createChatConnectHandler({
      socket,
      userId: 5,
      queryClient,
      getActiveRoomId: () => activeRoomId,
    })

    // First connect syncs socket events without double-fetching queries that just mounted.
    onConnect()
    expect(invalidateSpy).not.toHaveBeenCalled()

    // Reconnect invalidates both the rooms list and the open conversation's messages.
    onConnect()
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.chatRooms(5) })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.chatMessages(7, 5) })

    // Reconnect with no open room invalidates only the rooms list.
    invalidateSpy.mockClear()
    activeRoomId = null
    onConnect()
    expect(invalidateSpy).toHaveBeenCalledTimes(1)
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.chatRooms(5) })
  })

  it('invalidates chat rooms when a live message arrives for a room not in the store', () => {
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const addMessage = vi.fn()

    handleIncomingChatMessage({
      message: sampleMessage,
      userId: 5,
      rooms: [{ id: 1 }, { id: 2 }],
      addMessage,
      queryClient,
    })

    expect(addMessage).toHaveBeenCalledWith(sampleMessage, 5)
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.chatRooms(5) })
  })

  it('does not invalidate chat rooms when a live message belongs to a known room', () => {
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const addMessage = vi.fn()

    handleIncomingChatMessage({
      message: sampleMessage,
      userId: 5,
      rooms: [{ id: 9 }],
      addMessage,
      queryClient,
    })

    expect(addMessage).toHaveBeenCalledWith(sampleMessage, 5)
    expect(invalidateSpy).not.toHaveBeenCalled()
  })
})
