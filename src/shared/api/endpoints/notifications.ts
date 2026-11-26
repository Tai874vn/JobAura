import { apiClient } from '../client'
import { normalizeNotification, normalizeNotificationsResponse } from '../normalizers'
import type { ApiResponse, AppNotification, NotificationPage } from '@/shared/schemas'

type NotificationParams = {
  cursor?: string
  limit?: number
}

export const notificationsApi = {
  // Backend: GET /api/notifications → NestjsBE/src/modules/notifications/services/notifications.service.ts list()
  list: async (params: NotificationParams = {}) =>
    normalizeNotificationsResponse(
      (
        await apiClient.get<ApiResponse<NotificationPage>>(
          '/api/notifications',
          { params },
        )
      ).data,
    ),
  // Backend: GET /api/notifications/unread-count → NestjsBE/src/modules/notifications/services/notifications.service.ts unreadCount()
  unreadCount: async () =>
    (
      await apiClient.get<ApiResponse<{ unreadCount: number }>>(
        '/api/notifications/unread-count',
      )
    ).data,
  // Backend: PATCH /api/notifications/:id/read → NestjsBE/src/modules/notifications/services/notifications.service.ts markAsRead()
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
  // Backend: PATCH /api/notifications/read-all → NestjsBE/src/modules/notifications/services/notifications.service.ts markAllAsRead()
  markAllRead: async () =>
    (
      await apiClient.patch<ApiResponse<{ unreadCount: number }>>(
        '/api/notifications/read-all',
      )
    ).data,
}
