import { apiClient } from '../client'
import { normalizeNotification, normalizeNotificationsResponse } from '../normalizers'
import type { ApiResponse, AppNotification, NotificationPage } from '@/shared/schemas'

type NotificationParams = {
  cursor?: string
  limit?: number
}

export const notificationsApi = {
  list: async (params: NotificationParams = {}) =>
    normalizeNotificationsResponse(
      (
        await apiClient.get<ApiResponse<NotificationPage>>(
          '/api/notifications',
          { params },
        )
      ).data,
    ),
  unreadCount: async () =>
    (
      await apiClient.get<ApiResponse<{ unreadCount: number }>>(
        '/api/notifications/unread-count',
      )
    ).data,
  markRead: async (id: number) => {
    const response = (
      await apiClient.patch<ApiResponse<AppNotification>>(
        `/api/notifications/${id}/read`,
      )
    ).data
    return response.content
      ? { ...response, content: normalizeNotification(response.content) }
      : response
  },
  markAllRead: async () =>
    (
      await apiClient.patch<ApiResponse<{ unreadCount: number }>>(
        '/api/notifications/read-all',
      )
    ).data,
}
