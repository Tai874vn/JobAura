import {
  BriefcaseBusiness,
  CheckCircle2,
  Heart,
  MessageCircle,
  MessageSquare,
  UserCheck,
  UserPlus,
  type LucideIcon,
} from 'lucide-react'
import Image from 'next/image'
import { cn, initials, resolveAssetUrl, shouldBypassImageOptimizer } from '@/shared/lib/utils'
import type { AppNotification } from '@/shared/schemas'
import { Skeleton } from '@/shared/ui'
import {
  formatNotificationTime,
  notificationActivityTime,
  notificationContext,
  notificationDetail,
  notificationHeadline,
} from './notification-display'

type NotificationMeta = {
  icon: LucideIcon
  iconClassName: string
  unreadClassName: string
}

const notificationMeta: Record<AppNotification['type'], NotificationMeta> = {
  CHAT_MESSAGE: { icon: MessageCircle, iconClassName: 'bg-blue-50 text-blue-700 ring-blue-100', unreadClassName: 'border-blue-200 bg-blue-50/60' },
  CONNECTION_REQUEST: { icon: UserPlus, iconClassName: 'bg-emerald-50 text-emerald-700 ring-emerald-100', unreadClassName: 'border-emerald-200 bg-emerald-50/60' },
  CONNECTION_ACCEPTED: { icon: UserCheck, iconClassName: 'bg-emerald-50 text-emerald-700 ring-emerald-100', unreadClassName: 'border-emerald-200 bg-emerald-50/60' },
  POST_LIKE: { icon: Heart, iconClassName: 'bg-rose-50 text-rose-700 ring-rose-100', unreadClassName: 'border-rose-200 bg-rose-50/60' },
  POST_COMMENT: { icon: MessageSquare, iconClassName: 'bg-amber-50 text-amber-700 ring-amber-100', unreadClassName: 'border-amber-200 bg-amber-50/60' },
  HIRE_CREATED: { icon: BriefcaseBusiness, iconClassName: 'bg-violet-50 text-violet-700 ring-violet-100', unreadClassName: 'border-violet-200 bg-violet-50/60' },
  HIRE_COMPLETED: { icon: CheckCircle2, iconClassName: 'bg-violet-50 text-violet-700 ring-violet-100', unreadClassName: 'border-violet-200 bg-violet-50/60' },
}

export function NotificationSection({ title, notifications, onOpen, emptyText }: {
  title: string
  notifications: AppNotification[]
  onOpen: (notification: AppNotification) => Promise<void>
  emptyText: string
}) {
  return (
    <section className="mb-2">
      <div className="sticky top-0 z-10 flex items-center justify-between bg-surface px-2 py-1 text-xs font-medium text-muted">
        <span>{title}</span>
        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-muted">{notifications.length}</span>
      </div>
      {!notifications.length ? (
        <div className="mx-1 mb-2 rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs font-medium text-muted">{emptyText}</div>
      ) : null}
      {notifications.map((notification) => (
        <NotificationRow key={notification.id} notification={notification} onClick={() => void onOpen(notification)} />
      ))}
    </section>
  )
}

function NotificationRow({ notification, onClick }: { notification: AppNotification; onClick: () => void }) {
  const meta = notificationMeta[notification.type]
  const Icon = meta.icon
  const isUnread = !notification.readAt
  const context = notificationContext(notification)
  const detail = notificationDetail(notification)

  return (
    <button
      className={cn(
        'group relative mb-1 flex w-full gap-3 rounded-lg border border-transparent p-3 pr-7 text-left transition hover:border-border hover:bg-surface-muted',
        isUnread && meta.unreadClassName,
      )}
      onClick={onClick}
    >
      <NotificationAvatar notification={notification} />
      <span className={cn('mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1', meta.iconClassName)}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className={cn('block min-w-0 truncate text-sm', isUnread ? 'font-medium text-foreground' : 'font-medium text-muted')}>
            {notificationHeadline(notification)}
          </span>
          <time className="shrink-0 text-xs font-medium text-muted" dateTime={notificationActivityTime(notification)}>
            {formatNotificationTime(notificationActivityTime(notification))}
          </time>
        </span>
        {context ? <span className={cn('mt-1 block truncate text-xs font-medium', isUnread ? 'text-foreground' : 'text-muted')}>{context}</span> : null}
        {detail ? <span className={cn('mt-1.5 block line-clamp-2 text-sm leading-5', isUnread ? 'text-foreground' : 'text-muted')}>{detail}</span> : null}
      </span>
      {isUnread ? <span className="absolute right-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-danger" aria-label="Unread" /> : null}
    </button>
  )
}

function NotificationAvatar({ notification }: { notification: AppNotification }) {
  const actor = notification.actor
  const avatarUrl = resolveAssetUrl(actor?.avatar)

  return (
    <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-xs font-medium text-white">
      {avatarUrl && actor ? (
        <Image src={avatarUrl} alt={actor.name} fill unoptimized={shouldBypassImageOptimizer(actor.avatar)} className="object-cover" sizes="44px" />
      ) : initials(actor?.name)}
    </span>
  )
}

export function NotificationSkeleton() {
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
