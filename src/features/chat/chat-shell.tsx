'use client'

import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { useSession } from '@/features/auth/use-session'
import { Button } from '@/shared/ui'
import { ChatComposer } from './chat-composer'
import { ChatConversation } from './chat-conversation'
import { type OpenChatRequest } from './chat-data'
import { ChatRoomList } from './chat-room-list'
import { useChatRoomSelection } from './use-chat-room-selection'
import { useChatSocket } from './use-chat-socket'

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
