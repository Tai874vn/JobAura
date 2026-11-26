'use client'


import { useState } from 'react'
import { MessageCircle, Send } from 'lucide-react'
import { useSession } from '@/features/auth/hooks/use-session'
import { Button } from '@/shared/ui'
import { ChatConversation } from './chat-conversation'
import { type OpenChatRequest } from '../utils/chat-data'
import { ChatRoomList } from './chat-room-list'
import { useChatRoomSelection } from '../hooks/use-chat-room-selection'
import { useChatSocket } from '../hooks/use-chat-socket'

/**
 * The chat window in the bottom corner: room list, conversation and the message box. useChatRoomSelection loads
 * the rooms and the open room's messages; useChatSocket sends and receives messages live. The typed draft is kept
 * when the window closes.
 */
export function ChatShell({ initialRequest }: { initialRequest?: OpenChatRequest | null } = {}) {
  const { user } = useSession()
  const userId = user?.id
  // Keep the typed draft here (outside the `isOpen` branch) so closing and reopening chat does not wipe it.
  const [draft, setDraft] = useState('')

  // Hook order matters: room selection registers open-chat listeners and queries first, then `useChatSocket`
  // subscribes to `/chat` and synchronizes room joins and read receipts using the active room and fetched messages.
  const selection = useChatRoomSelection({ userId, initialRequest })
  const socket = useChatSocket({
    userId,
    isSocketActive: selection.isSocketActive,
    activeRoomId: selection.activeRoomId,
    activeMessages: selection.activeMessages,
    messagesData: selection.messagesQuery.data,
  })

  function handleDraftChange(nextValue: string) {
    setDraft(nextValue)
    socket.handleTypingChange(nextValue)
  }

  function handleSend() {
    const content = draft.trim()
    if (!content) return
    socket.sendMessage(content, () => {
      setDraft((current) => (current.trim() === content ? '' : current))
    })
  }

  if (!user) return null

  const activeRoomReaders = selection.activeRoomId ? socket.readReceipts[selection.activeRoomId] ?? [] : []
  const activeTypingUserIds = selection.activeRoomId ? socket.typingByRoom[selection.activeRoomId] ?? [] : []

  return (
    <>
      {!selection.isOpen ? (
        <Button
          className="motion-popover fixed bottom-5 right-5 z-40 h-12 rounded-full shadow-float"
          onClick={selection.openChat}
        >
          <MessageCircle className="h-4 w-4" />
          Chat
        </Button>
      ) : null}
      {selection.isOpen ? (
        // On a phone the panel is one column: the conversation list, or the open conversation with a back button.
        <section className="motion-panel fixed bottom-5 right-5 z-50 grid h-[min(580px,calc(100dvh-40px))] w-[720px] max-w-[calc(100vw-40px)] grid-cols-1 overflow-hidden rounded-lg border border-border bg-surface shadow-overlay sm:grid-cols-[280px_minmax(0,1fr)]">
          <ChatRoomList
            rooms={selection.rooms}
            activeRoomId={selection.activeRoomId}
            userId={userId}
            onlineUserIds={selection.onlineUserIds}
            isPending={selection.roomsQuery.isPending}
            isError={selection.roomsQuery.isError}
            hasData={Boolean(selection.roomsQuery.data)}
            error={selection.roomsQuery.error}
            onRetry={() => void selection.roomsQuery.refetch()}
            onSelectRoom={selection.openRoom}
          />
          <ChatConversation
            userId={user.id}
            activeRoomId={selection.activeRoomId}
            activeRoom={selection.activeRoom}
            activeRoomMessages={selection.activeRoomMessages}
            activeMessages={selection.activeMessages}
            title={selection.title}
            otherMembers={selection.otherMembers}
            peer={selection.peer}
            peerOnline={selection.peerOnline}
            activeRoomReaders={activeRoomReaders}
            activeTypingUserIds={activeTypingUserIds}
            isMessagesPending={selection.messagesQuery.isPending}
            isMessagesError={selection.messagesQuery.isError}
            isMessagesFetching={selection.messagesQuery.isFetching}
            messagesError={selection.messagesQuery.error}
            onRetryMessages={() => void selection.messagesQuery.refetch()}
            onBack={() => selection.setActiveRoom(null)}
            onClose={selection.closeChat}
            composer={
              <ChatComposer
                draft={draft}
                disabled={!selection.activeRoomId}
                isSending={socket.isSending}
                onDraftChange={handleDraftChange}
                onSend={handleSend}
              />
            }
          />
        </section>
      ) : null}
    </>
  )
}

/** Bottom reply bar of a conversation. Draft state lives in `ChatShell` so closing and reopening chat keeps it. */
export function ChatComposer({
  draft,
  disabled,
  isSending,
  onDraftChange,
  onSend,
}: {
  draft: string
  disabled: boolean
  isSending: boolean
  onDraftChange: (value: string) => void
  onSend: () => void
}) {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSend()
  }

  return (
    <form className="flex gap-2 border-t border-border p-2.5" onSubmit={handleSubmit}>
      <div className="flex min-w-0 flex-1 items-center field-shell rounded-md border border-border bg-surface px-4">
        <input
          className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none"
          placeholder="Write a reply"
          value={draft}
          maxLength={5000}
          onChange={(event) => onDraftChange(event.target.value)}
          disabled={disabled || isSending}
        />
      </div>
      <Button
        type="submit"
        className="h-10 w-10 shrink-0 rounded-full p-0"
        loading={isSending}
        disabled={disabled || !draft.trim() || isSending}
        aria-label="Send message"
      >
        <Send className="h-4 w-4" />
      </Button>
    </form>
  )
}
