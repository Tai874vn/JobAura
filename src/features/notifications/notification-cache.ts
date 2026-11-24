import type { QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/shared/api/query-keys'
import type { ApiResponse, AppNotification, NotificationPage } from '@/shared/schemas'
import { notificationTimeValue } from './notification-display'

export function prependNotification(
  queryClient: QueryClient,
  notification: AppNotification,
  limit: number,
  viewerId?: number | null,
) {
  queryClient.setQueryData<ApiResponse<NotificationPage>>(
    queryKeys.notifications(viewerId),
    (current) => {
      const existing = current?.content?.data ?? []
      const nextItems = existing.filter((item) => item.id !== notification.id)
      return {
        ...(current ?? {}),
        content: {
          data: sortNotificationsByActivity([notification, ...nextItems]).slice(0, limit),
          nextCursor: current?.content?.nextCursor ?? null,
        },
      }
    },
  )
}

export function updateNotificationInCache(
  queryClient: QueryClient,
  notification: AppNotification,
  viewerId?: number | null,
) {
  queryClient.setQueryData<ApiResponse<NotificationPage>>(
    queryKeys.notifications(viewerId),
    (current) => {
      if (!current?.content) return current
      return {
        ...current,
        content: {
          ...current.content,
          data: sortNotificationsByActivity(
            current.content.data.map((item) => item.id === notification.id ? notification : item),
          ),
        },
      }
    },
  )
}

export function markCachedNotificationsRead(queryClient: QueryClient, viewerId?: number | null) {
  const readAt = new Date().toISOString()
  queryClient.setQueryData<ApiResponse<NotificationPage>>(
    queryKeys.notifications(viewerId),
    (current) => {
      if (!current?.content) return current
      return {
        ...current,
        content: {
          ...current.content,
          data: sortNotificationsByActivity(
            current.content.data.map((item) => ({ ...item, readAt: item.readAt ?? readAt })),
          ),
        },
      }
    },
  )
}

export function sortNotificationsByActivity(notifications: AppNotification[]) {
  return [...notifications].sort((left, right) => {
    const leftUnread = left.readAt ? 0 : 1
    const rightUnread = right.readAt ? 0 : 1
    if (leftUnread !== rightUnread) return rightUnread - leftUnread

    const timeDifference = notificationTimeValue(right) - notificationTimeValue(left)
    if (timeDifference) return timeDifference
    return right.id - left.id
  })
}
