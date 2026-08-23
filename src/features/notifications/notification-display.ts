import type { AppNotification } from '@/shared/schemas'

export function roomIdFromNotification(notification: AppNotification) {
  const roomId = notification.metadata?.roomId
  if (typeof roomId === 'number') return roomId
  if (typeof roomId === 'string') {
    const parsed = Number(roomId)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export function safeInternalActionUrl(value: string | null | undefined) {
  const path = value?.trim()
  if (!path || !path.startsWith('/') || path.startsWith('//')) return null

  try {
    const url = new URL(path, 'https://jobaura.local')
    if (url.origin !== 'https://jobaura.local') return null
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return null
  }
}

export function notificationHeadline(notification: AppNotification) {
  const actorName = notification.actor?.name?.trim()
  if (!actorName) return notification.title
  if (notification.readAt) return actorName

  if (notification.type === 'CHAT_MESSAGE') {
    const count = unreadMessageCount(notification)
    return count === 1
      ? `New message from ${actorName}`
      : `${count} new messages from ${actorName}`
  }
  if (notification.type === 'CONNECTION_REQUEST') return `${actorName} sent a connection request`
  if (notification.type === 'CONNECTION_ACCEPTED') return `${actorName} accepted your request`
  if (notification.type === 'POST_LIKE') return `${actorName} reacted to your post`
  if (notification.type === 'POST_COMMENT') return `${actorName} commented on your post`
  if (notification.type === 'HIRE_CREATED') return `${actorName} created a hire update`
  if (notification.type === 'HIRE_COMPLETED') return `${actorName} completed a hire update`
  return actorName
}

export function notificationContext(notification: AppNotification) {
  if (notification.type === 'CHAT_MESSAGE') return 'Message'
  if (notification.type === 'POST_COMMENT' || notification.type === 'POST_LIKE') {
    return metadataString(notification, 'postTitle') ?? 'Post'
  }
  if (notification.type === 'CONNECTION_REQUEST' || notification.type === 'CONNECTION_ACCEPTED') return 'Connection'
  if (notification.type === 'HIRE_CREATED' || notification.type === 'HIRE_COMPLETED') return 'Hiring'
  return null
}

export function notificationDetail(notification: AppNotification) {
  if (notification.type === 'CHAT_MESSAGE') return null
  return notification.body || null
}

export function notificationActivityTime(notification: AppNotification) {
  return notification.updatedAt ?? notification.createdAt
}

export function notificationTimeValue(notification: AppNotification) {
  const value = new Date(notificationActivityTime(notification)).getTime()
  return Number.isNaN(value) ? 0 : value
}

export function formatNotificationTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const diffMs = Date.now() - date.getTime()
  if (diffMs < 60_000) return 'Just now'
  if (diffMs < 3_600_000) return `${Math.max(1, Math.floor(diffMs / 60_000))}m ago`
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`
  if (diffMs < 172_800_000) return 'Yesterday'
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function metadataString(notification: AppNotification, key: string) {
  const value = notification.metadata?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
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
