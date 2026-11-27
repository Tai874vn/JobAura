'use client'

/**
 * Conversation list panel on the left side of the chat drawer.
 * Displays each chat room with online status, last message preview, time, and unread count badge, plus loading, empty, and retry states.
 *
 * Calls: getErrorMessage
 * Used by:
 *   - features/chat/components/chat-shell.tsx
 */

import { cn, getErrorMessage } from '@/shared/lib/utils'
import type { ChatRoom } from '@/shared/schemas'
import { Avatar, Button, Skeleton } from '@/shared/ui'

type RoomListProps = {
  rooms: ChatRoom[]
  activeRoomId: number | null
  userId: number | undefined
  onlineUserIds: number[]
  isPending: boolean
  isError: boolean
  hasData: boolean
  error: unknown
  onRetry: () => void
  onSelectRoom: (room: ChatRoom) => void
}

/** Left column of the chat drawer: list of conversations, loading placeholders, or retry state. */
export function ChatRoomList({
  rooms,
  activeRoomId,
  userId,
  onlineUserIds,
  isPending,
  isError,
  hasData,
  error,
  onRetry,
  onSelectRoom,
}: RoomListProps) {
  return (
    <aside className={cn('min-w-0 flex-col border-r border-border bg-surface sm:flex', activeRoomId ? 'hidden' : 'flex')}>
      <div className="flex h-14 shrink-0 items-center border-b border-border px-4">
        <h2 className="font-display text-base font-medium">Messages</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {isPending ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="mb-2 flex items-center gap-3 rounded-lg p-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <span className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </span>
            </div>
          ))
        ) : isError && !hasData ? (
          <div className="p-4 text-center text-sm text-muted">
            {getErrorMessage(error, 'Conversations could not be loaded.')}
            <Button className="mx-auto mt-3" size="sm" variant="secondary" onClick={onRetry}>
              Retry
            </Button>
          </div>
        ) : rooms.length ? (
          rooms.map((room) => (
            <ChatRoomRow
              key={room.id}
              room={room}
              userId={userId}
              onlineUserIds={onlineUserIds}
              selected={activeRoomId === room.id}
              onSelect={() => onSelectRoom(room)}
            />
          ))
        ) : (
          <p className="p-4 text-center text-sm text-muted">No conversations yet.</p>
        )}
      </div>
    </aside>
  )
}

function ChatRoomRow({
  room,
  userId,
  onlineUserIds,
  selected,
  onSelect,
}: {
  room: ChatRoom
  userId: number | undefined
  onlineUserIds: number[]
  selected: boolean
  onSelect: () => void
}) {
  const member = room.members.find((candidate) => candidate.id !== userId)
  const name = room.name ?? member?.name ?? 'Conversation'
  const online = member ? onlineUserIds.includes(member.id) : false

  return (
    <button
      className={cn(
        'mb-1 flex w-full items-center gap-2.5 rounded-lg p-2.5 text-left text-sm transition hover:bg-surface-muted',
        selected && 'bg-primary/5'
      )}
      onClick={onSelect}
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
