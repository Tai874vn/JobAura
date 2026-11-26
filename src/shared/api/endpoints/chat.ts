import { apiClient } from '../client'
import type { ApiResponse, ChatMessage, ChatRoom } from '@/shared/schemas'

export const chatApi = {
  // Backend: GET /api/chat/rooms → NestjsBE/src/modules/chat/services/chat.service.ts getUserRooms()
  rooms: async () =>
    (await apiClient.get<ApiResponse<ChatRoom[]>>('/api/chat/rooms')).data,
  // Backend: GET /api/chat/rooms/:id → NestjsBE/src/modules/chat/services/chat.service.ts getRoom()
  room: async (id: number) =>
    (await apiClient.get<ApiResponse<ChatRoom>>(`/api/chat/rooms/${id}`)).data,
  // Backend: GET /api/chat/rooms/:id/messages → NestjsBE/src/modules/chat/services/chat.service.ts getMessages()
  messages: async (roomId: number) =>
    (
      await apiClient.get<ApiResponse<ChatMessage[]>>(
        `/api/chat/rooms/${roomId}/messages`,
      )
    ).data,
  // Backend: GET /api/chat/start/:userId → NestjsBE/src/modules/chat/services/chat.service.ts findPrivateRoom()
  start: async (userId: number) =>
    (await apiClient.get<ApiResponse<ChatRoom>>(`/api/chat/start/${userId}`)).data,
  // Backend: POST /api/chat/rooms → NestjsBE/src/modules/chat/services/chat.service.ts createRoom()
  createRoom: async (data: { name?: string; memberIds: number[] }) =>
    (await apiClient.post<ApiResponse<ChatRoom>>('/api/chat/rooms', data)).data,
}
