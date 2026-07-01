'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { io } from 'socket.io-client'
import { toast } from 'sonner'
import { chatApi, notificationsApi } from '@/shared/api/endpoints'
import { normalizeNotification } from '@/shared/api/normalizers'
import { queryKeys } from '@/shared/api/query-keys'
import { env } from '@/shared/config/env'
import { cn, initials, resolveAssetUrl, shouldBypassImageOptimizer } from '@/shared/lib/utils'
import type { ApiResponse, AppNotification, NotificationPage } from '@/shared/schemas'
import { useAuthStore } from '@/shared/stores/auth-store'
import { useChatStore } from '@/shared/stores/chat-store'
import { Button, Skeleton } from '@/shared/ui'

const previewLimit = 8

export function NotificationBell() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const userId = useAuthStore((state) => state.user?.id)
  const openChatForRoom = useChatStore((state) => state.openChatForRoom)
  const [open, setOpen] = useState(false)

  const listQuery = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () => notificationsApi.list({ limit: previewLimit }),
    enabled: Boolean(userId),
  })
  const countQuery = useQuery({
    queryKey: queryKeys.notificationUnreadCount,
    queryFn: notificationsApi.unreadCount,
    enabled: Boolean(userId),
    staleTime: 30_000,
  })

  const markRead = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: (response) => {
      if (response.content) updateNotificationInCache(queryClient, response.content)
      queryClient.invalidateQueries({ queryKey: queryKeys.notificationUnreadCount })
    },
    onError: () => toast.error('Could not update notification'),
  })

  const markAllRead = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => {
      markCachedNotificationsRead(queryClient)
      queryClient.setQueryData<ApiResponse<{ unreadCount: number }>>(queryKeys.notificationUnreadCount, (current) => ({
        ...(current ?? {}),
        content: { unreadCount: 0 },
      }))
    },
    onError: () => toast.error('Could not mark notifications as read'),
  })

  useEffect(() => {
    if (!userId) return
    const socket = io(`${env.apiBaseUrl}/notifications`, {
      withCredentials: true,
      autoConnect: true,
      transports: ['websocket', 'polling'],
    })

    socket.on('notification:new', (raw: unknown) => {
      const notification = normalizeNotification(raw)
      prependNotification(queryClient, notification)
    })
    socket.on('notifications:unread-count', ({ unreadCount }: { unreadCount: number }) => {
      queryClient.setQueryData<ApiResponse<{ unreadCount: number }>>(queryKeys.notificationUnreadCount, (current) => ({
        ...(current ?? {}),
        content: { unreadCount },
      }))
    })

    return () => {
      socket.disconnect()
    }
  }, [queryClient, userId])

  async function openNotification(notification: AppNotification) {
    if (!notification.readAt) await markRead.mutateAsync(notification.id)
    setOpen(false)

    if (notification.type === 'CHAT_MESSAGE') {
      const roomId = roomIdFromNotification(notification)
      if (roomId) {
        try {
          const room = (await chatApi.room(roomId)).content
          if (room) openChatForRoom(room)
          return
        } catch {
          toast.error('Could not open chat')
        }
      }
    }

    if (notification.actionUrl) router.push(notification.actionUrl)
  }

  const notifications = listQuery.data?.content?.data ?? []
  const unreadNotifications = notifications.filter((notification) => !notification.readAt)
  const readNotifications = notifications.filter((notification) => notification.readAt)
  const unreadCount = countQuery.data?.content?.unreadCount ?? 0
  const badge = unreadCount > 99 ? '99+' : String(unreadCount)

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((value) => !value)}
        title="Notifications"
        aria-label="Open notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount ? (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
            {badge}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div className="absolute right-0 top-11 z-50 w-[360px] max-w-[calc(100vw-24px)] overflow-hidden rounded-lg border border-border bg-white shadow-[0_18px_50px_rgba(0,0,0,0.16)]">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <h2 className="font-display text-lg font-bold">Notifications</h2>
              <p className="text-xs font-semibold text-muted">{unreadCount} unread</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              disabled={!unreadCount || markAllRead.isPending}
              onClick={() => markAllRead.mutate()}
            >
              {markAllRead.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
              Mark all
            </Button>
          </div>

          <div className="max-h-[420px] overflow-y-auto p-2">
            {listQuery.isPending ? (
              <NotificationSkeleton />
            ) : listQuery.isError ? (
              <div className="p-6 text-center text-sm text-muted">Notifications could not be loaded.</div>
            ) : notifications.length ? (
              <>
                <NotificationSection
                  title="New messages"
                  notifications={unreadNotifications}
                  onOpen={openNotification}
                />
                <NotificationSection
                  title="Old messages"
                  notifications={readNotifications}
                  onOpen={openNotification}
                />
              </>
            ) : (
              <div className="p-8 text-center">
                <Bell className="mx-auto h-7 w-7 text-primary" />
                <p className="mt-3 text-sm font-semibold">No notifications yet</p>
                <p className="mt-1 text-xs text-muted">Connection, post, hire, and chat updates will appear here.</p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function NotificationSection({
  title,
  notifications,
  onOpen,
}: {
  title: string
  notifications: AppNotification[]
  onOpen: (notification: AppNotification) => Promise<void>
}) {
  if (!notifications.length) return null

  return (
    <section className="mb-2">
      <div className="sticky top-0 z-10 bg-white px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-muted">
        {title}
      </div>
      {notifications.map((notification) => (
        <button
          key={notification.id}
          className={cn(
            'mb-1 flex w-full gap-3 rounded-lg p-3 text-left transition hover:bg-surface-muted',
            !notification.readAt && 'bg-primary/5'
          )}
          onClick={() => void onOpen(notification)}
        >
          <NotificationAvatar notification={notification} />
          <span className="min-w-0 flex-1">
            <span className="flex items-start justify-between gap-2">
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">
                  {notification.actor?.name ?? notification.title}
                </span>
                {notification.actor?.name ? (
                  <span className="mt-0.5 block text-xs font-bold uppercase tracking-wide text-muted">
                    {notification.title}
                  </span>
                ) : null}
              </span>
              {!notification.readAt ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" /> : null}
            </span>
            <span className="mt-1 block line-clamp-2 text-sm leading-5 text-muted">
              {notificationBody(notification)}
            </span>
            <span className="mt-2 block text-xs font-semibold text-muted">
              {formatNotificationTime(notification.createdAt)}
            </span>
          </span>
        </button>
      ))}
    </section>
  )
}

function NotificationAvatar({ notification }: { notification: AppNotification }) {
  const actor = notification.actor
  const avatarUrl = resolveAssetUrl(actor?.avatar)

  return (
    <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-xs font-bold text-white">
      {avatarUrl && actor ? (
        <Image src={avatarUrl} alt={actor.name} fill unoptimized={shouldBypassImageOptimizer(actor.avatar)} className="object-cover" sizes="40px" />
      ) : initials(actor?.name)}
    </span>
  )
}

function NotificationSkeleton() {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex gap-3 rounded-lg p-2">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

function roomIdFromNotification(notification: AppNotification) {
  const roomId = notification.metadata?.roomId
  if (typeof roomId === 'number') return roomId
  if (typeof roomId === 'string') {
    const parsed = Number(roomId)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function notificationBody(notification: AppNotification) {
  if (notification.type !== 'CHAT_MESSAGE') return notification.body
  const count = unreadMessageCount(notification)
  return count === 1 ? '1 new message' : `${count} new messages`
}

function unreadMessageCount(notification: AppNotification) {
  const count = notification.metadata?.unreadCount
  if (typeof count === 'number' && Number.isFinite(count)) return Math.max(1, count)
  if (typeof count === 'string') {
    const parsed = Number(count)
    if (Number.isFinite(parsed)) return Math.max(1, parsed)
  }
  return 1
}

function prependNotification(queryClient: QueryClient, notification: AppNotification) {
  queryClient.setQueryData<ApiResponse<NotificationPage>>(queryKeys.notifications, (current) => {
    const existing = current?.content?.data ?? []
    const nextItems = existing.filter((item) => item.id !== notification.id)
    return {
      ...(current ?? {}),
      content: {
        data: [notification, ...nextItems].slice(0, previewLimit),
        nextCursor: current?.content?.nextCursor ?? null,
      },
    }
  })
}

function updateNotificationInCache(queryClient: QueryClient, notification: AppNotification) {
  queryClient.setQueryData<ApiResponse<NotificationPage>>(queryKeys.notifications, (current) => {
    if (!current?.content) return current
    return {
      ...current,
      content: {
        ...current.content,
        data: current.content.data.map((item) => item.id === notification.id ? notification : item),
      },
    }
  })
}

function markCachedNotificationsRead(queryClient: QueryClient) {
  const readAt = new Date().toISOString()
  queryClient.setQueryData<ApiResponse<NotificationPage>>(queryKeys.notifications, (current) => {
    if (!current?.content) return current
    return {
      ...current,
      content: {
        ...current.content,
        data: current.content.data.map((item) => ({ ...item, readAt: item.readAt ?? readAt })),
      },
    }
  })
}

function formatNotificationTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
