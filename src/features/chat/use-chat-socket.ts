'use client'

import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Socket } from 'socket.io-client'
import { toast } from 'sonner'
import { useRealtimeConnection } from '@/features/auth/components/realtime-provider'
import { sanitizeUserMessage } from '@/shared/lib/errors'
import type { ChatMessage } from '@/shared/schemas'
import { useChatStore } from '@/shared/stores/chat-store'
import { createChatConnectHandler, handleIncomingChatMessage } from './chat-connection'
import { mergeRoomMessages } from './chat-data'

type SendMessageAcknowledgement = {
  status: 'success' | 'error' | 'rate_limited'
  message?: ChatMessage | string
}

function applyReadReceipt(
  current: Record<number, number[]>,
  roomId: number,
  readerId: number
): Record<number, number[]> {
  const readers = current[roomId] ?? []
  if (readers.includes(readerId)) return current
  return { ...current, [roomId]: [...readers, readerId] }
}

function applyTypingUpdate(
  current: Record<number, number[]>,
  roomId: number,
  typingUserId: number,
  isTyping: boolean | undefined
): Record<number, number[]> {
  const typers = new Set(current[roomId] ?? [])
  if (isTyping === false) {
    typers.delete(typingUserId)
    if (!typers.size) {
      const rest = { ...current }
      delete rest[roomId]
      return rest
    }
  } else {
    typers.add(typingUserId)
  }
  return { ...current, [roomId]: [...typers] }
}

/**
 * Owns the `/chat` Socket.IO subscription, live events (messages, read receipts, typing, online presence),
 * room join/read synchronization, outgoing typing throttling, and sending messages.
 *
 * Effect order matters here: the `/chat` subscription effect runs first so `socketRef.current` is ready
 * before the `join-room` and `mark-as-read` effects run in the same commit.
 */
export function useChatSocket({
  userId,
  isSocketActive,
  activeRoomId,
  activeMessages,
  messagesData,
}: {
  userId: number | undefined
  isSocketActive: boolean
  activeRoomId: number | null
  activeMessages: ChatMessage[]
  messagesData: { content?: ChatMessage[] } | undefined
}) {
  const queryClient = useQueryClient()
  const connection = useRealtimeConnection()
  const setMessages = useChatStore((state) => state.setMessages)
  const addMessage = useChatStore((state) => state.addMessage)
  const setOnlineUserIds = useChatStore((state) => state.setOnlineUserIds)

  const socketRef = useRef<Socket | null>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTypingSentAtRef = useRef(0)
  const [isSending, setIsSending] = useState(false)
  const [readReceipts, setReadReceipts] = useState<Record<number, number[]>>({})
  const [typingByRoom, setTypingByRoom] = useState<Record<number, number[]>>({})

  useEffect(() => {
    if (!userId || !isSocketActive || !connection) return
    return connection.subscribe('/chat', (nextSocket) => {
      const onConnect = createChatConnectHandler({
        socket: nextSocket,
        userId,
        queryClient,
        getActiveRoomId: () => useChatStore.getState().activeRoomId,
      })
      const onConnectError = (error: Error) => {
        console.error('Chat connection failed:', error.message)
      }
      const onNewMessage = (message: ChatMessage) =>
        handleIncomingChatMessage({
          message,
          userId,
          rooms: useChatStore.getState().rooms,
          addMessage,
          queryClient,
        })
      const onMessagesRead = ({ roomId, userId: readerId }: { roomId: number; userId: number }) => {
        setReadReceipts((current) => applyReadReceipt(current, roomId, readerId))
      }
      const onTyping = (payload: { roomId?: number; userId?: number; isTyping?: boolean }) => {
        const roomId = payload?.roomId
        const typingUserId = payload?.userId
        if (!roomId || !typingUserId || typingUserId === userId) return
        setTypingByRoom((current) => applyTypingUpdate(current, roomId, typingUserId, payload.isTyping))
      }
      const onUserOnline = ({ userId: onlineUserId }: { userId: number }) => {
        const current = useChatStore.getState().onlineUserIds
        if (!current.includes(onlineUserId)) setOnlineUserIds([...current, onlineUserId])
      }
      const onUserOffline = ({ userId: offlineUserId }: { userId: number }) => {
        setOnlineUserIds(useChatStore.getState().onlineUserIds.filter((id) => id !== offlineUserId))
      }

      nextSocket.on('connect', onConnect)
      nextSocket.on('connect_error', onConnectError)
      nextSocket.on('new-message', onNewMessage)
      nextSocket.on('messages-read', onMessagesRead)
      nextSocket.on('typing', onTyping)
      nextSocket.on('online-users', setOnlineUserIds)
      nextSocket.on('user-online', onUserOnline)
      nextSocket.on('user-offline', onUserOffline)
      socketRef.current = nextSocket
      if (nextSocket.connected) onConnect()

      return () => {
        // Remove only this feature's handlers; another subscriber may still
        // use the namespace and the Manager also serves notifications.
        nextSocket.off('connect', onConnect)
        nextSocket.off('connect_error', onConnectError)
        nextSocket.off('new-message', onNewMessage)
        nextSocket.off('messages-read', onMessagesRead)
        nextSocket.off('typing', onTyping)
        nextSocket.off('online-users', setOnlineUserIds)
        nextSocket.off('user-online', onUserOnline)
        nextSocket.off('user-offline', onUserOffline)
        if (socketRef.current === nextSocket) socketRef.current = null
      }
    })
  }, [addMessage, connection, isSocketActive, queryClient, setOnlineUserIds, userId])

  useEffect(() => {
    if (!activeRoomId || !isSocketActive) return
    socketRef.current?.emit('join-room', { roomId: activeRoomId })
  }, [activeRoomId, isSocketActive])

  useEffect(() => {
    if (!activeRoomId || !messagesData) return
    const fetched = messagesData.content ?? []
    const existing = useChatStore.getState().messagesByRoom[activeRoomId] ?? []
    setMessages(activeRoomId, mergeRoomMessages(fetched, existing))
    socketRef.current?.emit('mark-as-read', { roomId: activeRoomId })
  }, [activeRoomId, messagesData, setMessages])

  // Stop any outgoing typing indicator when switching rooms or closing/unmounting.
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current)
        typingTimerRef.current = null
      }
      if (activeRoomId && lastTypingSentAtRef.current > 0) {
        socketRef.current?.emit('typing', { roomId: activeRoomId, isTyping: false })
        lastTypingSentAtRef.current = 0
      }
    }
  }, [activeRoomId])

  useEffect(() => {
    if (!activeRoomId || !userId || !activeMessages.length) return
    const latestMessage = activeMessages[activeMessages.length - 1]
    if (latestMessage?.sender.id !== userId) {
      socketRef.current?.emit('mark-as-read', { roomId: activeRoomId })
    }
  }, [activeMessages, activeRoomId, userId])

  function stopTyping(roomId: number, socket: Socket | null = socketRef.current) {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current)
      typingTimerRef.current = null
    }
    if (lastTypingSentAtRef.current > 0) {
      socket?.emit('typing', { roomId, isTyping: false })
      lastTypingSentAtRef.current = 0
    }
  }

  function handleTypingChange(nextValue: string) {
    if (!activeRoomId) return
    const now = Date.now()
    if (nextValue.trim()) {
      // Throttle typing events to at most once every 1.5s and auto-clear after 2s of silence.
      if (now - lastTypingSentAtRef.current >= 1500) {
        socketRef.current?.emit('typing', { roomId: activeRoomId, isTyping: true })
        lastTypingSentAtRef.current = now
      }
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
      const roomId = activeRoomId
      typingTimerRef.current = setTimeout(() => {
        socketRef.current?.emit('typing', { roomId, isTyping: false })
        lastTypingSentAtRef.current = 0
        typingTimerRef.current = null
      }, 2000)
    } else if (lastTypingSentAtRef.current > 0) {
      stopTyping(activeRoomId)
    }
  }

  function sendMessage(content: string, onSuccess: () => void) {
    if (!content || !activeRoomId || isSending) return
    const socket = socketRef.current
    if (!socket?.connected) {
      toast.error('Chat is reconnecting. Your message was not sent.')
      return
    }
    setIsSending(true)
    stopTyping(activeRoomId, socket)
    socket.timeout(10_000).emit(
      'send-message',
      { roomId: activeRoomId, content },
      (error: Error | null, acknowledgement?: SendMessageAcknowledgement) => {
        setIsSending(false)
        if (error || acknowledgement?.status !== 'success') {
          const fallback = error ? 'The request timed out.' : 'Your message was not sent. Please try again.'
          toast.error(sanitizeUserMessage(acknowledgement?.message, fallback))
          return
        }
        onSuccess()
      }
    )
  }

  return {
    isSending,
    readReceipts,
    typingByRoom,
    handleTypingChange,
    sendMessage,
  }
}
