'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Socket } from 'socket.io-client'
import { ArrowLeft, CheckCheck, MessageCircle, Send, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useRealtimeConnection } from '@/features/auth/realtime-provider'
import { useSession } from '@/features/auth/use-session'
import { chatApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { cn } from '@/shared/lib/utils'
import type { ChatMessage, ChatRoom } from '@/shared/schemas'
import { useChatStore } from '@/shared/stores/chat-store'
import { Avatar, Button, Skeleton } from '@/shared/ui'
import { synchronizeChatConnection } from './chat-connection'
import { shouldLoadRoomMessages } from './chat-data'

type SendMessageAcknowledgement = {
  status: 'success' | 'error' | 'rate_limited'
  message?: ChatMessage | string
}

export function ChatShell() {
  const { user } = useSession()
  const connection = useRealtimeConnection()
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
  const onlineUserIds = useChatStore((state) => state.onlineUserIds)
  const socketRef = useRef<Socket | null>(null)
  const messageListRef = useRef<HTMLDivElement | null>(null)
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [readReceipts, setReadReceipts] = useState<Record<number, number[]>>({})
  const [typingByRoom, setTypingByRoom] = useState<Record<number, number[]>>({})

  const roomsQuery = useQuery({
    queryKey: queryKeys.chatRooms,
    queryFn: chatApi.rooms,
    enabled: Boolean(userId && isSocketActive),
  })

  useEffect(() => {
    if (roomsQuery.data?.content) setRooms(roomsQuery.data.content)
  }, [roomsQuery.data, setRooms])

  useEffect(() => {
    if (!userId || !isSocketActive || !connection) return
    return connection.subscribe('/chat', (nextSocket) => {
      const onConnect = () => synchronizeChatConnection(nextSocket, useChatStore.getState().activeRoomId)
      const onConnectError = (error: Error) => {
        console.error('Chat connection failed:', error.message)
      }
      const onNewMessage = (message: ChatMessage) => addMessage(message, userId)
      const onMessagesRead = ({ roomId, userId: readerId }: { roomId: number; userId: number }) => {
        setReadReceipts((current) => {
          const readers = current[roomId] ?? []
          if (readers.includes(readerId)) return current
          return { ...current, [roomId]: [...readers, readerId] }
        })
      }
      const onTyping = (payload: { roomId?: number; userId?: number; isTyping?: boolean }) => {
        const roomId = payload?.roomId
        const typingUserId = payload?.userId
        if (!roomId || !typingUserId || typingUserId === userId) return
        setTypingByRoom((current) => {
          const typers = new Set(current[roomId] ?? [])
          if (payload.isTyping === false) {
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
        })
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
  }, [addMessage, connection, isSocketActive, setOnlineUserIds, userId])

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

  // Keep the newest message in view when a conversation opens, a message arrives, or someone starts typing.
  const typingCount = activeRoomId ? typingByRoom[activeRoomId]?.length ?? 0 : 0
  useEffect(() => {
    const list = messageListRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [activeRoomId, activeMessages.length, typingCount])

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
  const peer = otherMembers[0]
  const peerOnline = peer ? onlineUserIds.includes(peer.id) : false
  const activeTypingUserIds = activeRoomId ? typingByRoom[activeRoomId] ?? [] : []

  if (!user) return null

  return (
    <>
      {!isOpen ? (
        <Button
          className="fixed bottom-5 right-5 z-40 h-12 rounded-full shadow-float"
          onClick={openChat}
        >
          <MessageCircle className="h-4 w-4" />
          Chat
        </Button>
      ) : null}
      {isOpen ? (
        // On a phone the panel is one column: the conversation list, or the open conversation with a back button.
        <section className="motion-panel fixed bottom-5 right-5 z-50 grid h-[min(580px,calc(100dvh-40px))] w-[720px] max-w-[calc(100vw-40px)] grid-cols-1 overflow-hidden rounded-lg border border-border bg-surface shadow-overlay sm:grid-cols-[280px_minmax(0,1fr)]">
          <aside className={cn('min-w-0 flex-col border-r border-border bg-surface sm:flex', activeRoomId ? 'hidden' : 'flex')}>
            <div className="flex h-14 shrink-0 items-center border-b border-border px-4">
              <h2 className="font-display text-base font-medium">Messages</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {roomsQuery.isPending ? Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="mb-2 flex items-center gap-3 rounded-lg p-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
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
                const member = room.members.find((candidate) => candidate.id !== userId)
                const name = room.name ?? member?.name ?? 'Conversation'
                const online = member ? onlineUserIds.includes(member.id) : false
                return (
                  <button
                    key={room.id}
                    className={cn(
                      'mb-1 flex w-full items-center gap-2.5 rounded-lg p-2.5 text-left text-sm transition hover:bg-surface-muted',
                      activeRoomId === room.id && 'bg-primary/5'
                    )}
                    onClick={() => void openRoom(room)}
                  >
                    <span className="relative shrink-0">
                      <Avatar name={name} src={member?.avatar} size="sm" />
                      {online ? (
                        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-primary-bright" aria-label="Online" />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-[13.5px] font-medium">{name}</span>
                        {room.lastMessage?.createdAt ? <span className="shrink-0 text-xs font-medium text-muted">{formatRoomTime(room.lastMessage.createdAt)}</span> : null}
                      </span>
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs text-muted">{room.lastMessage?.content ?? 'No replies yet'}</span>
                        {room.unreadCount ? <span className="grid h-[18px] min-w-[18px] shrink-0 place-items-center rounded-full bg-primary px-1 text-xs font-medium text-white">{room.unreadCount}</span> : null}
                      </span>
                    </span>
                  </button>
                )
              }) : (
                <p className="p-4 text-center text-sm text-muted">No conversations yet.</p>
              )}
            </div>
          </aside>
          <main className={cn('min-h-0 min-w-0 flex-col sm:flex', activeRoomId ? 'flex' : 'hidden')}>
            <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-4">
              {activeRoomId ? (
                <span className="flex min-w-0 items-center gap-2.5">
                  <Button variant="ghost" size="icon" className="-ml-2 shrink-0 sm:hidden" onClick={() => setActiveRoom(null)} aria-label="Back to conversations">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Avatar name={title} src={peer?.avatar} size="sm" className="h-8 w-8" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{title}</span>
                    {peerOnline ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-muted">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary-bright" aria-hidden="true" /> Online
                      </span>
                    ) : null}
                  </span>
                </span>
              ) : (
                <h3 className="min-w-0 truncate text-sm font-medium">{title}</h3>
              )}
              <Button variant="ghost" size="icon" onClick={closeChat} aria-label="Close chat">
                <X className="h-4 w-4" />
              </Button>
            </div>
            {/* A flex column, so each message can sit on its own side: yours on the right, theirs on the left. */}
            <div ref={messageListRef} className="flex flex-1 flex-col gap-2.5 overflow-y-auto bg-background p-4">
              {activeRoomId ? (
                <>
                  {activeMessages.map((message) => {
                    const own = message.sender.id === user.id
                    return (
                      <div key={message.id} className={cn('flex min-w-0 max-w-[76%] flex-col', own ? 'self-end items-end' : 'self-start items-start')}>
                        <div className={cn(
                          'max-w-full whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-6 [overflow-wrap:anywhere]',
                          own ? 'rounded-br-md bg-primary text-white' : 'rounded-bl-md border border-border bg-surface'
                        )}>
                          {message.content}
                        </div>
                        {message.createdAt ? <time className="mt-1 text-xs text-muted">{formatMessageTime(message.createdAt)}</time> : null}
                        {own && message.id === latestOwnMessageId ? (
                          <span className={cn('mt-0.5 flex items-center gap-1 text-xs font-medium', latestOwnMessageSeen ? 'text-primary' : 'text-muted')}>
                            <CheckCheck className="h-3 w-3" />
                            {latestOwnMessageSeen ? 'Seen' : 'Sent'}
                          </span>
                        ) : null}
                      </div>
                    )
                  })}
                  {activeTypingUserIds.length ? (
                    <div className="flex items-center gap-2 self-start rounded-md border border-border bg-surface px-3.5 py-2" aria-live="polite">
                      <span className="flex gap-1">
                        {[0, 1, 2].map((dot) => (
                          <span key={dot} className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted" style={{ animationDelay: `${dot * 0.15}s` }} />
                        ))}
                      </span>
                      <span className="text-xs font-medium text-muted">{title || 'Someone'} is typing…</span>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 text-sm text-muted">
                  <MessageCircle className="h-6 w-6 text-primary/40" />
                  Choose a conversation to start chatting.
                </div>
              )}
            </div>
            <form className="flex gap-2 border-t border-border p-2.5" onSubmit={sendMessage}>
              <div className="flex min-w-0 flex-1 items-center field-shell rounded-md border border-border bg-surface px-4">
                <input
                  className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none"
                  placeholder="Write a reply"
                  value={draft}
                  maxLength={5000}
                  onChange={(event) => {
                    setDraft(event.target.value)
                    if (activeRoomId) socketRef.current?.emit('typing', { roomId: activeRoomId, isTyping: true })
                  }}
                  disabled={!activeRoomId || isSending}
                />
              </div>
              <Button
                type="submit"
                className="h-10 w-10 shrink-0 rounded-full p-0"
                loading={isSending}
                disabled={!activeRoomId || !draft.trim() || isSending}
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </main>
        </section>
      ) : null}
    </>
  )
}

function formatMessageTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatRoomTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  const now = new Date()
  const sameDay = date.toDateString() === now.toDateString()
  if (sameDay) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const days = Math.round((now.getTime() - date.getTime()) / 86_400_000)
  if (days < 7) return `${days}d`
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[date.getMonth()]} ${date.getDate()}`
}

function wasReadAfter(readAt: string | null | undefined, messageCreatedAt: string) {
  if (!readAt) return false
  const readTime = new Date(readAt).getTime()
  const messageTime = new Date(messageCreatedAt).getTime()
  return Number.isFinite(readTime) && Number.isFinite(messageTime) && readTime >= messageTime
}
