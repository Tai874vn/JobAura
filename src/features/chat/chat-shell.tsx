'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { MessageCircle, Send, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { chatApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { env } from '@/shared/config/env'
import { cn, initials } from '@/shared/lib/utils'
import type { ChatMessage, ChatRoom } from '@/shared/schemas'
import { useAuthStore } from '@/shared/stores/auth-store'
import { useChatStore } from '@/shared/stores/chat-store'
import { Button, Skeleton } from '@/shared/ui'

export function ChatShell() {
  const user = useAuthStore((state) => state.user)
  const { isOpen, isSocketActive, rooms, activeRoomId, messagesByRoom, openChat, closeChat, setRooms, setActiveRoom, setMessages, addMessage, setOnlineUserIds } =
    useChatStore()
  const socketRef = useRef<Socket | null>(null)
  const [draft, setDraft] = useState('')

  const roomsQuery = useQuery({
    queryKey: queryKeys.chatRooms,
    queryFn: chatApi.rooms,
    enabled: Boolean(user && isSocketActive),
  })

  useEffect(() => {
    if (roomsQuery.data?.content) setRooms(roomsQuery.data.content)
  }, [roomsQuery.data, setRooms])

  useEffect(() => {
    if (!user || !isSocketActive) return
    const nextSocket = io(`${env.apiBaseUrl}/chat`, {
      withCredentials: true,
      autoConnect: true,
      transports: ['websocket', 'polling'],
    })

    nextSocket.on('connect', () => nextSocket.emit('get-online-users'))
    nextSocket.on('rooms', (payload: ChatRoom[]) => setRooms(payload))
    nextSocket.on('new-message', (message: ChatMessage) => addMessage(message))
    nextSocket.on('online-users', (ids: number[]) => setOnlineUserIds(ids))
    socketRef.current = nextSocket

    return () => {
      nextSocket.disconnect()
      socketRef.current = null
    }
  }, [addMessage, isSocketActive, setOnlineUserIds, setRooms, user])

  const activeMessages = activeRoomId ? messagesByRoom[activeRoomId] ?? [] : []
  const activeRoom = rooms.find((room) => room.id === activeRoomId)

  async function openRoom(room: ChatRoom) {
    setActiveRoom(room.id)
    socketRef.current?.emit('join-room', { roomId: room.id })
    const result = await chatApi.messages(room.id)
    setMessages(room.id, result.content ?? [])
    socketRef.current?.emit('mark-as-read', { roomId: room.id })
  }

  function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft.trim() || !activeRoomId) return
    socketRef.current?.emit('send-message', { roomId: activeRoomId, content: draft.trim() })
    setDraft('')
  }

  const title = useMemo(() => activeRoom?.name ?? activeRoom?.members.find((member) => member.id !== user?.id)?.name ?? 'Messages', [activeRoom, user])

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
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <h2 className="font-display text-lg font-bold">Messages</h2>
              <Button variant="ghost" size="icon" onClick={closeChat}>
                <X className="h-4 w-4" />
              </Button>
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
              )) : rooms.map((room) => {
                const name = room.name ?? room.members.find((member) => member.id !== user.id)?.name ?? 'Conversation'
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
                      <span className="block truncate text-xs text-muted">{room.lastMessage?.content ?? 'No messages yet'}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </aside>
          <main className="flex min-w-0 flex-col">
            <div className="flex h-14 items-center border-b border-border px-4">
              <h3 className="font-semibold">{title}</h3>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto bg-background p-4">
              {activeRoomId ? (
                activeMessages.map((message) => (
                  <div key={message.id} className={cn('flex', message.sender.id === user.id ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-[72%] rounded-lg px-3 py-2 text-sm', message.sender.id === user.id ? 'bg-primary text-white' : 'bg-white border border-border')}>
                      {message.content}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted">Choose a room to start messaging.</div>
              )}
            </div>
            <form className="flex gap-2 border-t border-border p-3" onSubmit={sendMessage}>
              <input
                className="h-10 flex-1 rounded-lg border border-border px-3 text-sm outline-none focus:border-primary"
                placeholder="Type a message"
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value)
                  if (activeRoomId) socketRef.current?.emit('typing', { roomId: activeRoomId })
                }}
                disabled={!activeRoomId}
              />
              <Button size="icon" disabled={!activeRoomId || !draft.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </main>
        </section>
      ) : null}
    </>
  )
}
