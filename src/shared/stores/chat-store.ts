'use client'

import { create } from 'zustand'
import type { ChatMessage, ChatRoom } from '@/shared/schemas'

interface TypingUser {
  userId: number
  roomId: number
  name: string
}

interface ChatState {
  isOpen: boolean
  isSocketActive: boolean
  rooms: ChatRoom[]
  activeRoomId: number | null
  messagesByRoom: Record<number, ChatMessage[]>
  onlineUserIds: number[]
  typingUsers: TypingUser[]
  openChat: () => void
  openChatForRoom: (room: ChatRoom) => void
  closeChat: () => void
  setRooms: (rooms: ChatRoom[]) => void
  setActiveRoom: (roomId: number | null) => void
  setMessages: (roomId: number, messages: ChatMessage[]) => void
  addMessage: (message: ChatMessage, viewerId?: number) => void
  setOnlineUserIds: (ids: number[]) => void
  setTypingUsers: (users: TypingUser[]) => void
  reset: () => void
}

export const useChatStore = create<ChatState>((set) => ({
  isOpen: false,
  isSocketActive: false,
  rooms: [],
  activeRoomId: null,
  messagesByRoom: {},
  onlineUserIds: [],
  typingUsers: [],
  openChat: () => set({ isOpen: true, isSocketActive: true }),
  openChatForRoom: (room) =>
    set((state) => ({
      isOpen: true,
      isSocketActive: true,
      activeRoomId: room.id,
      rooms: [room, ...state.rooms.filter((item) => item.id !== room.id)],
    })),
  closeChat: () => set({ isOpen: false }),
  setRooms: (rooms) => set({ rooms }),
  setActiveRoom: (activeRoomId) =>
    set((state) => ({
      activeRoomId,
      rooms: activeRoomId
        ? state.rooms.map((room) =>
            room.id === activeRoomId ? { ...room, unreadCount: 0 } : room
          )
        : state.rooms,
    })),
  setMessages: (roomId, messages) =>
    set((state) => ({ messagesByRoom: { ...state.messagesByRoom, [roomId]: messages } })),
  addMessage: (message, viewerId) =>
    set((state) => {
      const messages = state.messagesByRoom[message.roomId] ?? []
      const exists = messages.some((item) => item.id === message.id)
      const shouldIncrementUnread =
        !exists &&
        message.sender.id !== viewerId &&
        state.activeRoomId !== message.roomId
      const rooms = state.rooms.map((room) =>
        room.id === message.roomId
          ? {
              ...room,
              lastMessage: message,
              unreadCount: shouldIncrementUnread
                ? room.unreadCount + 1
                : room.unreadCount,
            }
          : room
      )
      return {
        messagesByRoom: {
          ...state.messagesByRoom,
          [message.roomId]: exists ? messages : [...messages, message],
        },
        rooms,
      }
    }),
  setOnlineUserIds: (onlineUserIds) => set({ onlineUserIds }),
  setTypingUsers: (typingUsers) => set({ typingUsers }),
  reset: () =>
    set({
      isOpen: false,
      isSocketActive: false,
      rooms: [],
      activeRoomId: null,
      messagesByRoom: {},
      onlineUserIds: [],
      typingUsers: [],
    }),
}))
