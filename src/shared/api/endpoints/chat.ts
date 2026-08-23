import { apiClient } from '../client'
import type { ApiResponse, ChatMessage, ChatRoom } from '@/shared/schemas'

export const chatApi = {
  rooms: async () =>
    (await apiClient.get<ApiResponse<ChatRoom[]>>('/api/chat/rooms')).data,
  room: async (id: number) =>
    (await apiClient.get<ApiResponse<ChatRoom>>(`/api/chat/rooms/${id}`)).data,
  messages: async (roomId: number) =>
    (
      await apiClient.get<ApiResponse<ChatMessage[]>>(
        `/api/chat/rooms/${roomId}/messages`,
      )
    ).data,
  start: async (userId: number) =>
    (await apiClient.get<ApiResponse<ChatRoom>>(`/api/chat/start/${userId}`)).data,
  createRoom: async (data: { name?: string; memberIds: number[] }) =>
    (await apiClient.post<ApiResponse<ChatRoom>>('/api/chat/rooms', data)).data,
}
