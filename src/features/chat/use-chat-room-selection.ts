'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { chatApi } from '@/shared/api/endpoints'
import { reportServerError } from '@/shared/api/query-client'
import { queryKeys } from '@/shared/api/query-keys'
import { getErrorMessage } from '@/shared/lib/utils'
import type { ChatRoom } from '@/shared/schemas'
import { useChatStore } from '@/shared/stores/chat-store'
import { openChatEventName, parseOpenChatRequest, type OpenChatRequest } from './chat-data'

/**
 * Opens the room an `OpenChatRequest` names. A user id gets the direct room with that person (the server makes
 * it when there is none yet).
 */
async function roomFor(request: OpenChatRequest): Promise<ChatRoom | null> {
  if (request.roomId) return (await chatApi.room(request.roomId)).content ?? null
  if (request.userId) return (await chatApi.start(request.userId)).content ?? null
  return null
}

/**
 * Manages room selection, external open-chat requests (from `jobaura:open-chat` or `initialRequest`),
 * and the React Query fetches for the room list and active room history.
 */
export function useChatRoomSelection({
  userId,
  initialRequest,
}: {
  userId: number | undefined
  initialRequest?: OpenChatRequest | null
}) {
  const queryClient = useQueryClient()
  const isOpen = useChatStore((state) => state.isOpen)
  const isSocketActive = useChatStore((state) => state.isSocketActive)
  const rooms = useChatStore((state) => state.rooms)
  const activeRoomId = useChatStore((state) => state.activeRoomId)
  const messagesByRoom = useChatStore((state) => state.messagesByRoom)
  const onlineUserIds = useChatStore((state) => state.onlineUserIds)
  const openChat = useChatStore((state) => state.openChat)
  const openChatForRoom = useChatStore((state) => state.openChatForRoom)
  const closeChat = useChatStore((state) => state.closeChat)
  const setRooms = useChatStore((state) => state.setRooms)
  const setActiveRoom = useChatStore((state) => state.setActiveRoom)

  // Other screens (applicants, my applications, contracts) ask for a chat with `jobaura:open-chat`.
  // A request made before this widget loaded comes in as `initialRequest`.
  const openRequestedChat = useRef((request: OpenChatRequest) => { void request })
  useEffect(() => {
    openRequestedChat.current = (request) => {
      void roomFor(request)
        .then((room) => {
          if (!room) return openChat()
          openChatForRoom(room)
          void queryClient.invalidateQueries({ queryKey: queryKeys.chatRooms(userId) })
        })
        .catch((error: unknown) => {
          reportServerError(error, 'chat:open-room')
          toast.error(getErrorMessage(error, 'Could not open the chat'))
        })
    }
  })

  useEffect(() => {
    if (!userId) return
    const onOpen = (event: Event) => {
      const request = parseOpenChatRequest((event as CustomEvent).detail)
      if (request) openRequestedChat.current(request)
    }
    window.addEventListener(openChatEventName, onOpen)
    return () => window.removeEventListener(openChatEventName, onOpen)
  }, [userId])

  const startRequest = useRef(initialRequest)
  useEffect(() => {
    if (userId && startRequest.current) openRequestedChat.current(startRequest.current)
    startRequest.current = null
  }, [userId])

  const roomsQuery = useQuery({
    queryKey: queryKeys.chatRooms(userId),
    queryFn: chatApi.rooms,
    enabled: Boolean(userId && isSocketActive),
  })

  useEffect(() => {
    if (roomsQuery.data?.content) setRooms(roomsQuery.data.content)
  }, [roomsQuery.data, setRooms])

  const activeRoomMessages = activeRoomId ? messagesByRoom[activeRoomId] : undefined
  const activeMessages = useMemo(
    () => activeRoomMessages ?? [],
    [activeRoomMessages]
  )
  const activeRoom = rooms.find((room) => room.id === activeRoomId)

  // Load room history through React Query instead of an effect depending on messagesByRoom,
  // so an incoming message in another room never cancels or re-fires the active room's fetch.
  const messagesQuery = useQuery({
    queryKey: queryKeys.chatMessages(activeRoomId ?? 0, userId),
    queryFn: () => chatApi.messages(activeRoomId as number),
    enabled: Boolean(userId && activeRoomId && isOpen),
    staleTime: Infinity,
  })

  const title = useMemo(
    () => activeRoom?.name ?? activeRoom?.members.find((member) => member.id !== userId)?.name ?? 'Select a conversation',
    [activeRoom, userId]
  )
  const otherMembers = activeRoom?.members.filter((member) => member.id !== userId) ?? []
  const peer = otherMembers[0]
  const peerOnline = peer ? onlineUserIds.includes(peer.id) : false

  function openRoom(room: ChatRoom) {
    setActiveRoom(room.id)
  }

  return {
    isOpen,
    isSocketActive,
    rooms,
    activeRoomId,
    activeRoom,
    activeRoomMessages,
    activeMessages,
    onlineUserIds,
    title,
    otherMembers,
    peer,
    peerOnline,
    roomsQuery,
    messagesQuery,
    openChat,
    closeChat,
    openRoom,
    setActiveRoom,
  }
}
