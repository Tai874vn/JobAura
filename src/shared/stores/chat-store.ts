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
  addMessage: (message: ChatMessage) => void
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
  setActiveRoom: (activeRoomId) => set({ activeRoomId }),
  setMessages: (roomId, messages) =>
    set((state) => ({ messagesByRoom: { ...state.messagesByRoom, [roomId]: messages } })),
  addMessage: (message) =>
    set((state) => {
      const messages = state.messagesByRoom[message.roomId] ?? []
      const rooms = state.rooms.map((room) =>
        room.id === message.roomId ? { ...room, lastMessage: message, unreadCount: room.unreadCount + 1 } : room
      )
      return { messagesByRoom: { ...state.messagesByRoom, [message.roomId]: [...messages, message] }, rooms }
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
