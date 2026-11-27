'use client'

/**
 * Active conversation panel on the right side of the chat drawer.
 * Shows the room header with online status, scrollable message bubbles, read receipts, typing status, a direct proposal shortcut, and the composer slot.
 *
 * Calls: ChatProposalButton; getErrorMessage
 * Used by:
 *   - features/chat/components/chat-shell.tsx
 */

import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { ArrowLeft, CheckCheck, MessageCircle, X } from 'lucide-react'
import { ChatProposalButton } from '@/features/contracts/components/chat-proposal-button'
import { cn, getErrorMessage } from '@/shared/lib/utils'
import type { ChatMessage, ChatRoom, ChatUser } from '@/shared/schemas'
import { Avatar, Button, Skeleton } from '@/shared/ui'

type ConversationProps = {
  userId: number
  activeRoomId: number | null
  activeRoom: ChatRoom | undefined
  activeRoomMessages: ChatMessage[] | undefined
  activeMessages: ChatMessage[]
  title: string
  otherMembers: ChatUser[]
  peer: ChatUser | undefined
  peerOnline: boolean
  activeRoomReaders: number[]
  activeTypingUserIds: number[]
  isMessagesPending: boolean
  isMessagesError: boolean
  isMessagesFetching: boolean
  messagesError: unknown
  onRetryMessages: () => void
  onBack: () => void
  onClose: () => void
  composer: ReactNode
}

/** Right column of the chat drawer: conversation header, scrollable message list, proposal shortcut, and composer. */
export function ChatConversation({
  userId,
  activeRoomId,
  activeRoom,
  activeRoomMessages,
  activeMessages,
  title,
  otherMembers,
  peer,
  peerOnline,
  activeRoomReaders,
  activeTypingUserIds,
  isMessagesPending,
  isMessagesError,
  isMessagesFetching,
  messagesError,
  onRetryMessages,
  onBack,
  onClose,
  composer,
}: ConversationProps) {
  const messageListRef = useRef<HTMLDivElement | null>(null)

  const latestOwnMessageId = useMemo(
    () => [...activeMessages].reverse().find((message) => message.sender.id === userId)?.id,
    [activeMessages, userId]
  )
  const latestOwnMessage = activeMessages.find((message) => message.id === latestOwnMessageId)
  const latestOwnMessageSeen = Boolean(
    latestOwnMessage &&
      otherMembers.length > 0 &&
      otherMembers.every((member) =>
        activeRoomReaders.includes(member.id) || wasReadAfter(member.lastReadAt, latestOwnMessage.createdAt)
      )
  )

  // Keep the newest message in view when a conversation opens, a message arrives, or someone starts typing.
  const typingCount = activeTypingUserIds.length
  useEffect(() => {
    const list = messageListRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [activeRoomId, activeMessages.length, typingCount])

  return (
    <div className={cn('min-h-0 min-w-0 flex-col sm:flex', activeRoomId ? 'flex' : 'hidden')}>
      <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-4">
        {activeRoomId ? (
          <span className="flex min-w-0 items-center gap-2.5">
            <Button variant="ghost" size="icon" className="-ml-2 shrink-0 sm:hidden" onClick={onBack} aria-label="Back to conversations">
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
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close chat">
          <X className="h-4 w-4" />
        </Button>
      </div>
      {/* A flex column, so each message can sit on its own side: yours on the right, theirs on the left. */}
      <div ref={messageListRef} className="flex flex-1 flex-col gap-2.5 overflow-y-auto bg-background p-4">
        {activeRoomId ? (
          activeRoomMessages === undefined && isMessagesPending ? (
            <div className="flex flex-1 flex-col gap-3" role="status" aria-label="Loading conversation" aria-busy="true">
              <span className="sr-only">Loading conversation</span>
              <Skeleton className="h-10 w-48 max-w-[76%] self-start rounded-2xl rounded-bl-md" />
              <Skeleton className="h-10 w-40 max-w-[76%] self-end rounded-2xl rounded-br-md" />
              <Skeleton className="h-12 w-56 max-w-[76%] self-start rounded-2xl rounded-bl-md" />
              <Skeleton className="h-10 w-44 max-w-[76%] self-end rounded-2xl rounded-br-md" />
            </div>
          ) : activeRoomMessages === undefined && isMessagesError ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-sm text-muted">
              <p>{getErrorMessage(messagesError, 'Could not load this conversation.')}</p>
              <Button type="button" size="sm" variant="secondary" loading={isMessagesFetching} onClick={onRetryMessages}>
                Retry
              </Button>
            </div>
          ) : (
            <>
              {activeMessages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  own={message.sender.id === userId}
                  isLatestOwn={message.sender.id === userId && message.id === latestOwnMessageId}
                  seen={latestOwnMessageSeen}
                />
              ))}
              {activeTypingUserIds.length ? (
                <div className="flex items-center gap-2 self-start rounded-md border border-border bg-surface px-3.5 py-2" aria-live="polite">
                  <span className="flex gap-1">
                    {[0, 1, 2].map((dot) => (
                      <span key={dot} className="h-1.5 w-1.5 motion-safe:animate-pulse rounded-full bg-muted" style={{ animationDelay: `${dot * 0.15}s` }} />
                    ))}
                  </span>
                  <span className="text-xs font-medium text-muted">{title || 'Someone'} is typing…</span>
                </div>
              ) : null}
            </>
          )
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-sm text-muted">
            <MessageCircle className="h-6 w-6 text-primary/40" />
            Choose a conversation to start chatting.
          </div>
        )}
      </div>
      {/* Only in a direct chat (one other person); the button hides itself when that person sells nothing. */}
      {activeRoom && !activeRoom.isGroup && peer ? (
        <ChatProposalButton key={peer.id} otherUserId={peer.id} viewerId={userId} onSent={onClose} />
      ) : null}
      {composer}
    </div>
  )
}

function MessageBubble({
  message,
  own,
  isLatestOwn,
  seen,
}: {
  message: ChatMessage
  own: boolean
  isLatestOwn: boolean
  seen: boolean
}) {
  return (
    <div className={cn('flex min-w-0 max-w-[76%] flex-col', own ? 'self-end items-end' : 'self-start items-start')}>
      <div className={cn(
        'max-w-full whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-6 [overflow-wrap:anywhere]',
        own ? 'rounded-br-md bg-primary text-white' : 'rounded-bl-md border border-border bg-surface'
      )}>
        {message.content}
      </div>
      {message.createdAt ? <time className="mt-1 text-xs text-muted">{formatMessageTime(message.createdAt)}</time> : null}
      {isLatestOwn ? (
        <span className={cn('mt-0.5 flex items-center gap-1 text-xs font-medium', seen ? 'text-primary' : 'text-muted')}>
          <CheckCheck className="h-3 w-3" />
          {seen ? 'Seen' : 'Sent'}
        </span>
      ) : null}
    </div>
  )
}

function formatMessageTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function wasReadAfter(readAt: string | null | undefined, messageCreatedAt: string) {
  if (!readAt) return false
  const readTime = new Date(readAt).getTime()
  const messageTime = new Date(messageCreatedAt).getTime()
  return Number.isFinite(readTime) && Number.isFinite(messageTime) && readTime >= messageTime
}
