import type { QueryClient } from '@tanstack/react-query'
import type { Socket } from 'socket.io-client'
import { queryKeys } from '@/shared/api/query-keys'
import type { ChatMessage, ChatRoom } from '@/shared/schemas'

export type ChatResyncOptions = {
  queryClient: QueryClient
  userId: number
  isReconnect: boolean
}

export function synchronizeChatConnection(
  socket: Socket,
  activeRoomId: number | null,
  resync?: ChatResyncOptions,
) {
  socket.emit('get-online-users')
  if (activeRoomId) {
    // Room selection can precede the lazy socket setup. Rejoin on every connect
    // so both that first selection and reconnects restore the active conversation.
    socket.emit('join-room', { roomId: activeRoomId })
    socket.emit('mark-as-read', { roomId: activeRoomId })
  }

  // On reconnect, refetch the room list and open conversation so messages sent while offline appear.
  if (resync?.isReconnect) {
    void resync.queryClient.invalidateQueries({ queryKey: queryKeys.chatRooms(resync.userId) })
    if (activeRoomId) {
      void resync.queryClient.invalidateQueries({
        queryKey: queryKeys.chatMessages(activeRoomId, resync.userId),
      })
    }
  }
}

/**
 * Returns a Socket.IO `connect` listener that synchronizes room state on the first connect
 * and also invalidates cached rooms and active messages on every later reconnect.
 */
export function createChatConnectHandler({
  socket,
  userId,
  queryClient,
  getActiveRoomId,
}: {
  socket: Socket
  userId: number
  queryClient: QueryClient
  getActiveRoomId: () => number | null
}) {
  let hasConnected = false
  return () => {
    const isReconnect = hasConnected
    hasConnected = true
    synchronizeChatConnection(socket, getActiveRoomId(), {
      queryClient,
      userId,
      isReconnect,
    })
  }
}

/**
 * Stores a live incoming message and refreshes the room list when it belongs to a room
 * that is not in the client store yet.
 */
export function handleIncomingChatMessage({
  message,
  userId,
  rooms,
  addMessage,
  queryClient,
}: {
  message: ChatMessage
  userId: number
  rooms: Pick<ChatRoom, 'id'>[]
  addMessage: (message: ChatMessage, viewerId?: number) => void
  queryClient: QueryClient
}) {
  const hasRoom = rooms.some((room) => room.id === message.roomId)
  addMessage(message, userId)
  if (!hasRoom) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.chatRooms(userId) })
  }
}
