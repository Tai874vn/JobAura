'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { MessageCircle, Send, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useSession } from '@/features/auth/use-session'
import { authApi, chatApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { env } from '@/shared/config/env'
import { cn, initials } from '@/shared/lib/utils'
import { fetchRealtimeAuth } from '@/shared/realtime/realtime-auth'
import type { ChatMessage, ChatRoom } from '@/shared/schemas'
import { useChatStore } from '@/shared/stores/chat-store'
import { Button, Skeleton } from '@/shared/ui'
import { shouldLoadRoomMessages } from './chat-data'

type SendMessageAcknowledgement = {
  status: 'success' | 'error' | 'rate_limited'
  message?: ChatMessage | string
}

export function ChatShell() {
  const { user } = useSession()
  const userId = user?.id
  const isOpen = useChatStore((state) => state.isOpen)
  const isSocketActive = useChatStore((state) => state.isSocketActive)
  const rooms = useChatStore((state) => state.rooms)
  const activeRoomId = useChatStore((state) => state.activeRoomId)
  const messagesByRoom = useChatStore((state) => state.messagesByRoom)
  const openChat = useChatStore((state) => state.openChat)
  const closeChat = useChatStore((state) => state.closeChat)
  const setRooms = useChatStore((state) => state.setRooms)
  const setActiveRoom = useChatStore((state) => state.setActiveRoom)
  const setMessages = useChatStore((state) => state.setMessages)
  const addMessage = useChatStore((state) => state.addMessage)
  const setOnlineUserIds = useChatStore((state) => state.setOnlineUserIds)
  const socketRef = useRef<Socket | null>(null)
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [readReceipts, setReadReceipts] = useState<Record<number, number[]>>({})

  const roomsQuery = useQuery({
    queryKey: queryKeys.chatRooms,
    queryFn: chatApi.rooms,
    enabled: Boolean(userId && isSocketActive),
  })

  useEffect(() => {
    if (roomsQuery.data?.content) setRooms(roomsQuery.data.content)
  }, [roomsQuery.data, setRooms])

  useEffect(() => {
    if (!userId || !isSocketActive) return
    const nextSocket = io(`${env.apiBaseUrl}/chat`, {
      withCredentials: true,
      autoConnect: true,
      transports: ['websocket', 'polling'],
      auth: (callback) => {
        void fetchRealtimeAuth(authApi.realtimeTicket)
          .then(callback)
          .catch(() => callback({}))
      },
    })

    nextSocket.on('connect', () => nextSocket.emit('get-online-users'))
    nextSocket.on('connect_error', (error) => {
      console.error('Chat connection failed:', error.message)
    })
    nextSocket.on('new-message', (message: ChatMessage) => addMessage(message, userId))
    nextSocket.on('messages-read', ({ roomId, userId: readerId }: { roomId: number; userId: number }) => {
      setReadReceipts((current) => {
        const readers = current[roomId] ?? []
        if (readers.includes(readerId)) return current
        return { ...current, [roomId]: [...readers, readerId] }
      })
    })
    nextSocket.on('online-users', (ids: number[]) => setOnlineUserIds(ids))
    nextSocket.on('user-online', ({ userId: onlineUserId }: { userId: number }) => {
      const current = useChatStore.getState().onlineUserIds
      if (!current.includes(onlineUserId)) setOnlineUserIds([...current, onlineUserId])
    })
    nextSocket.on('user-offline', ({ userId: offlineUserId }: { userId: number }) => {
      setOnlineUserIds(useChatStore.getState().onlineUserIds.filter((id) => id !== offlineUserId))
    })
    socketRef.current = nextSocket

    return () => {
      nextSocket.disconnect()
      socketRef.current = null
    }
  }, [addMessage, isSocketActive, setOnlineUserIds, userId])

  const activeMessages = useMemo(
    () => activeRoomId ? messagesByRoom[activeRoomId] ?? [] : [],
    [activeRoomId, messagesByRoom]
  )
  const activeRoom = rooms.find((room) => room.id === activeRoomId)

  useEffect(() => {
    if (!shouldLoadRoomMessages(activeRoomId, messagesByRoom)) return
    const roomId = activeRoomId
    if (!roomId) return

    let cancelled = false
    socketRef.current?.emit('join-room', { roomId })
    void chatApi.messages(roomId)
      .then((result) => {
        if (cancelled) return
        setMessages(roomId, result.content ?? [])
        socketRef.current?.emit('mark-as-read', { roomId })
      })
      .catch(() => {
        if (!cancelled) toast.error('Could not load this conversation')
      })

    return () => {
      cancelled = true
    }
  }, [activeRoomId, messagesByRoom, setMessages])

  useEffect(() => {
    if (!activeRoomId || !userId || !activeMessages.length) return
    const latestMessage = activeMessages[activeMessages.length - 1]
    if (latestMessage?.sender.id !== userId) {
      socketRef.current?.emit('mark-as-read', { roomId: activeRoomId })
    }
  }, [activeMessages, activeRoomId, userId])

  function openRoom(room: ChatRoom) {
    setActiveRoom(room.id)
  }

  function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = draft.trim()
    if (!content || !activeRoomId || isSending) return
    const socket = socketRef.current
    if (!socket?.connected) {
      toast.error('Chat is reconnecting. Your message was not sent.')
      return
    }
    setIsSending(true)
    socket.timeout(10_000).emit(
      'send-message',
      { roomId: activeRoomId, content },
      (error: Error | null, acknowledgement?: SendMessageAcknowledgement) => {
        setIsSending(false)
        if (error || acknowledgement?.status !== 'success') {
          const message = typeof acknowledgement?.message === 'string'
            ? acknowledgement.message
            : 'Your message was not sent. Please try again.'
          toast.error(message)
          return
        }
        setDraft((current) => current.trim() === content ? '' : current)
      }
    )
  }

  const title = useMemo(
    () => activeRoom?.name ?? activeRoom?.members.find((member) => member.id !== userId)?.name ?? 'Select a conversation',
    [activeRoom, userId]
  )
  const latestOwnMessageId = useMemo(
    () => userId ? [...activeMessages].reverse().find((message) => message.sender.id === userId)?.id : undefined,
    [activeMessages, userId]
  )
  const latestOwnMessage = activeMessages.find((message) => message.id === latestOwnMessageId)
  const activeRoomReaders = activeRoomId ? readReceipts[activeRoomId] ?? [] : []
  const otherMembers = activeRoom?.members.filter((member) => member.id !== userId) ?? []
  const latestOwnMessageSeen = Boolean(latestOwnMessage && otherMembers.length > 0 && otherMembers.every((member) =>
    activeRoomReaders.includes(member.id) || wasReadAfter(member.lastReadAt, latestOwnMessage.createdAt)
  ))

  if (!user) return null

  return (
    <>
      {!isOpen ? (
        <Button
          className="fixed bottom-5 right-5 z-40 h-12 rounded-lg shadow-[0_12px_32px_rgba(0,0,0,0.14)]"
          onClick={openChat}
        >
          <MessageCircle className="h-4 w-4" />
          Chat
        </Button>
      ) : null}
      {isOpen ? (
        <section className="fixed bottom-5 right-5 z-50 grid h-[560px] w-[720px] max-w-[calc(100vw-40px)] grid-cols-[260px_1fr] overflow-hidden rounded-lg border border-border bg-white shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
          <aside className="border-r border-border bg-surface-muted">
            <div className="flex h-14 items-center border-b border-border px-4">
              <h2 className="font-display text-lg font-bold">Inbox</h2>
            </div>
            <div className="max-h-[506px] overflow-y-auto p-2">
              {roomsQuery.isPending ? Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="mb-2 flex items-center gap-3 rounded-lg p-3">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <span className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </span>
                </div>
              )) : roomsQuery.isError && !roomsQuery.data ? (
                <div className="p-4 text-center text-sm text-muted">
                  Conversations could not be loaded.
                  <Button className="mx-auto mt-3" size="sm" variant="secondary" onClick={() => roomsQuery.refetch()}>
                    Retry
                  </Button>
                </div>
              ) : rooms.length ? rooms.map((room) => {
                const name = room.name ?? room.members.find((member) => member.id !== userId)?.name ?? 'Conversation'
                return (
                  <button
                    key={room.id}
                    className={cn(
                      'mb-2 flex w-full items-center gap-3 rounded-lg p-3 text-left text-sm hover:bg-white',
                      activeRoomId === room.id && 'bg-white shadow-sm'
                    )}
                    onClick={() => void openRoom(room)}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                      {initials(name)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{name}</span>
                      <span className="block truncate text-xs text-muted">{room.lastMessage?.content ?? 'No replies yet'}</span>
                    </span>
                  </button>
                )
              }) : (
                <p className="p-4 text-center text-sm text-muted">No conversations yet.</p>
              )}
            </div>
          </aside>
          <main className="flex min-w-0 flex-col">
            <div className="flex h-14 items-center justify-between gap-3 border-b border-border px-4">
              <h3 className="min-w-0 truncate font-semibold">{title}</h3>
              <Button variant="ghost" size="icon" onClick={closeChat} aria-label="Close chat">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto bg-background p-4">
              {activeRoomId ? (
                activeMessages.map((message) => (
                  <div key={message.id} className={cn('flex', message.sender.id === user.id ? 'justify-end' : 'justify-start')}>
                    <div className="max-w-[72%]">
                      <div className={cn('rounded-lg px-3 py-2 text-sm', message.sender.id === user.id ? 'bg-primary text-white' : 'bg-white border border-border')}>
                        {message.content}
                      </div>
                      {message.sender.id === user.id && message.id === latestOwnMessageId ? (
                        <div className="mt-1 text-right text-[11px] font-semibold text-muted">
                          {latestOwnMessageSeen ? 'Seen' : 'Sent'}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted">Choose a conversation to start chatting.</div>
              )}
            </div>
            <form className="flex gap-2 border-t border-border p-3" onSubmit={sendMessage}>
              <input
                className="h-10 flex-1 rounded-lg border border-border px-3 text-sm outline-none focus:border-primary"
                placeholder="Write a reply"
                value={draft}
                maxLength={5000}
                onChange={(event) => {
                  setDraft(event.target.value)
                  if (activeRoomId) socketRef.current?.emit('typing', { roomId: activeRoomId, isTyping: true })
                }}
                disabled={!activeRoomId || isSending}
              />
              <Button size="icon" disabled={!activeRoomId || !draft.trim() || isSending}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </main>
        </section>
      ) : null}
    </>
  )
}

function wasReadAfter(readAt: string | null | undefined, messageCreatedAt: string) {
  if (!readAt) return false
  const readTime = new Date(readAt).getTime()
  const messageTime = new Date(messageCreatedAt).getTime()
  return Number.isFinite(readTime) && Number.isFinite(messageTime) && readTime >= messageTime
}
