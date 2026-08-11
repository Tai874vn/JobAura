"use client";

import { useEffect, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import {
  Bell,
  BriefcaseBusiness,
  CheckCheck,
  CheckCircle2,
  Heart,
  Loader2,
  MessageCircle,
  MessageSquare,
  UserCheck,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import { toast } from "sonner";
import { chatApi, notificationsApi } from "@/shared/api/endpoints";
import { normalizeNotification } from "@/shared/api/normalizers";
import { queryKeys } from "@/shared/api/query-keys";
import { env } from "@/shared/config/env";
import {
  cn,
  initials,
  resolveAssetUrl,
  shouldBypassImageOptimizer,
} from "@/shared/lib/utils";
import type {
  ApiResponse,
  AppNotification,
  NotificationPage,
} from "@/shared/schemas";
import { useAuthStore } from "@/shared/stores/auth-store";
import { useChatStore } from "@/shared/stores/chat-store";
import { Button, Skeleton } from "@/shared/ui";

const previewLimit = 8;

type NotificationMeta = {
  icon: LucideIcon;
  iconClassName: string;
  unreadClassName: string;
};

const notificationMeta: Record<AppNotification["type"], NotificationMeta> = {
  CHAT_MESSAGE: {
    icon: MessageCircle,
    iconClassName: "bg-blue-50 text-blue-700 ring-blue-100",
    unreadClassName: "border-blue-200 bg-blue-50/60",
  },
  CONNECTION_REQUEST: {
    icon: UserPlus,
    iconClassName: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    unreadClassName: "border-emerald-200 bg-emerald-50/60",
  },
  CONNECTION_ACCEPTED: {
    icon: UserCheck,
    iconClassName: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    unreadClassName: "border-emerald-200 bg-emerald-50/60",
  },
  POST_LIKE: {
    icon: Heart,
    iconClassName: "bg-rose-50 text-rose-700 ring-rose-100",
    unreadClassName: "border-rose-200 bg-rose-50/60",
  },
  POST_COMMENT: {
    icon: MessageSquare,
    iconClassName: "bg-amber-50 text-amber-700 ring-amber-100",
    unreadClassName: "border-amber-200 bg-amber-50/60",
  },
  HIRE_CREATED: {
    icon: BriefcaseBusiness,
    iconClassName: "bg-violet-50 text-violet-700 ring-violet-100",
    unreadClassName: "border-violet-200 bg-violet-50/60",
  },
  HIRE_COMPLETED: {
    icon: CheckCircle2,
    iconClassName: "bg-violet-50 text-violet-700 ring-violet-100",
    unreadClassName: "border-violet-200 bg-violet-50/60",
  },
};

export function NotificationBell() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const openChatForRoom = useChatStore((state) => state.openChatForRoom);
  const [open, setOpen] = useState(false);

  const listQuery = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () => notificationsApi.list({ limit: previewLimit }),
    enabled: Boolean(userId),
  });
  const countQuery = useQuery({
    queryKey: queryKeys.notificationUnreadCount,
    queryFn: notificationsApi.unreadCount,
    enabled: Boolean(userId),
    staleTime: 30_000,
  });

  const markRead = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: (response) => {
      if (response.content)
        updateNotificationInCache(queryClient, response.content);
      queryClient.invalidateQueries({
        queryKey: queryKeys.notificationUnreadCount,
      });
    },
    onError: () => toast.error("Could not update notification"),
  });

  const markAllRead = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => {
      markCachedNotificationsRead(queryClient);
      queryClient.setQueryData<ApiResponse<{ unreadCount: number }>>(
        queryKeys.notificationUnreadCount,
        (current) => ({
          ...(current ?? {}),
          content: { unreadCount: 0 },
        }),
      );
    },
    onError: () => toast.error("Could not mark notifications as read"),
  });

  useEffect(() => {
    if (!userId) return;
    const socket = io(`${env.apiBaseUrl}/notifications`, {
      withCredentials: true,
      autoConnect: true,
      transports: ["websocket", "polling"],
    });

    socket.on("notification:new", (raw: unknown) => {
      const notification = normalizeNotification(raw);
      prependNotification(queryClient, notification);
    });
    socket.on(
      "notifications:unread-count",
      ({ unreadCount }: { unreadCount: number }) => {
        queryClient.setQueryData<ApiResponse<{ unreadCount: number }>>(
          queryKeys.notificationUnreadCount,
          (current) => ({
            ...(current ?? {}),
            content: { unreadCount },
          }),
        );
      },
    );

    return () => {
      socket.disconnect();
    };
  }, [queryClient, userId]);

  async function openNotification(notification: AppNotification) {
    if (!notification.readAt) await markRead.mutateAsync(notification.id);
    setOpen(false);

    if (notification.type === "CHAT_MESSAGE") {
      const roomId = roomIdFromNotification(notification);
      if (roomId) {
        try {
          const room = (await chatApi.room(roomId)).content;
          if (room) openChatForRoom(room);
          return;
        } catch {
          toast.error("Could not open chat");
        }
      }
    }

    const actionUrl = safeInternalActionUrl(notification.actionUrl);
    if (actionUrl) router.push(actionUrl);
    else if (notification.actionUrl)
      toast.error("This notification link is unavailable");
  }

  const notifications = sortNotificationsByActivity(
    listQuery.data?.content?.data ?? [],
  );
  const unreadNotifications = notifications.filter(
    (notification) => !notification.readAt,
  );
  const readNotifications = notifications.filter(
    (notification) => notification.readAt,
  );
  const unreadCount = countQuery.data?.content?.unreadCount ?? 0;
  const badge = unreadCount > 99 ? "99+" : String(unreadCount);

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
        <div className="absolute right-0 top-11 z-50 w-[420px] max-w-[calc(100vw-24px)] overflow-hidden rounded-lg border border-border bg-white shadow-[0_18px_50px_rgba(0,0,0,0.16)]">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <h2 className="font-display text-lg font-bold">Notifications</h2>
              <p className="text-xs font-semibold text-muted">
                {unreadCount
                  ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}`
                  : "All caught up"}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              disabled={!unreadCount || markAllRead.isPending}
              onClick={() => markAllRead.mutate()}
            >
              {markAllRead.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4" />
              )}
              Mark all
            </Button>
          </div>

          <div className="max-h-[460px] overflow-y-auto p-2">
            {listQuery.isPending ? (
              <NotificationSkeleton />
            ) : listQuery.isError ? (
              <div className="p-6 text-center text-sm text-muted">
                Notifications could not be loaded.
              </div>
            ) : notifications.length ? (
              <>
                <NotificationSection
                  title="Unread"
                  notifications={unreadNotifications}
                  onOpen={openNotification}
                  emptyText="No unread notifications"
                />
                <NotificationSection
                  title="Read"
                  notifications={readNotifications}
                  onOpen={openNotification}
                  emptyText="Read notifications will move here"
                />
              </>
            ) : (
              <div className="p-8 text-center">
                <Bell className="mx-auto h-7 w-7 text-primary" />
                <p className="mt-3 text-sm font-semibold">
                  No notifications yet
                </p>
                <p className="mt-1 text-xs text-muted">
                  Connection, post, hire, and chat updates will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function NotificationSection({
  title,
  notifications,
  onOpen,
  emptyText,
}: {
  title: string;
  notifications: AppNotification[];
  onOpen: (notification: AppNotification) => Promise<void>;
  emptyText: string;
}) {
  return (
    <section className="mb-2">
      <div className="sticky top-0 z-10 flex items-center justify-between bg-white px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-muted">
        <span>{title}</span>
        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] text-muted">
          {notifications.length}
        </span>
      </div>
      {!notifications.length ? (
        <div className="mx-1 mb-2 rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs font-semibold text-muted">
          {emptyText}
        </div>
      ) : null}
      {notifications.map((notification) => (
        <NotificationRow
          key={notification.id}
          notification={notification}
          onClick={() => void onOpen(notification)}
        />
      ))}
    </section>
  );
}

function NotificationRow({
  notification,
  onClick,
}: {
  notification: AppNotification;
  onClick: () => void;
}) {
  const meta = notificationMeta[notification.type];
  const Icon = meta.icon;
  const isUnread = !notification.readAt;
  const context = notificationContext(notification);
  const detail = notificationDetail(notification);

  return (
    <button
      className={cn(
        "group relative mb-1 flex w-full gap-3 rounded-lg border border-transparent p-3 pr-7 text-left transition hover:border-border hover:bg-surface-muted",
        isUnread && meta.unreadClassName,
      )}
      onClick={onClick}
    >
      <NotificationAvatar notification={notification} />
      <span
        className={cn(
          "mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1",
          meta.iconClassName,
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span
            className={cn(
              "block min-w-0 truncate text-sm",
              isUnread
                ? "font-bold text-foreground"
                : "font-semibold text-muted",
            )}
          >
            {notificationHeadline(notification)}
          </span>
          <time
            className="shrink-0 text-xs font-semibold text-muted"
            dateTime={notificationActivityTime(notification)}
          >
            {formatNotificationTime(notificationActivityTime(notification))}
          </time>
        </span>

        {context ? (
          <span
            className={cn(
              "mt-1 block truncate text-xs font-semibold uppercase tracking-wide",
              isUnread ? "text-foreground" : "text-muted",
            )}
          >
            {context}
          </span>
        ) : null}

        {detail ? (
          <span
            className={cn(
              "mt-1.5 block line-clamp-2 text-sm leading-5",
              isUnread ? "text-foreground" : "text-muted",
            )}
          >
            {detail}
          </span>
        ) : null}
      </span>
      {isUnread ? (
        <span
          className="absolute right-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-danger"
          aria-label="Unread"
        />
      ) : null}
    </button>
  );
}

function NotificationAvatar({
  notification,
}: {
  notification: AppNotification;
}) {
  const actor = notification.actor;
  const avatarUrl = resolveAssetUrl(actor?.avatar);

  return (
    <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-xs font-bold text-white">
      {avatarUrl && actor ? (
        <Image
          src={avatarUrl}
          alt={actor.name}
          fill
          unoptimized={shouldBypassImageOptimizer(actor.avatar)}
          className="object-cover"
          sizes="44px"
        />
      ) : (
        initials(actor?.name)
      )}
    </span>
  );
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
  );
}

function roomIdFromNotification(notification: AppNotification) {
  const roomId = notification.metadata?.roomId;
  if (typeof roomId === "number") return roomId;
  if (typeof roomId === "string") {
    const parsed = Number(roomId);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function safeInternalActionUrl(value: string | null | undefined) {
  const path = value?.trim();
  if (!path || !path.startsWith("/") || path.startsWith("//")) return null;

  try {
    const url = new URL(path, "https://jobaura.local");
    if (url.origin !== "https://jobaura.local") return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

function notificationHeadline(notification: AppNotification) {
  const actorName = notification.actor?.name?.trim();
  if (!actorName) return notification.title;
  if (notification.readAt) return actorName;

  if (notification.type === "CHAT_MESSAGE") {
    const count = unreadMessageCount(notification);
    return count === 1
      ? `New message from ${actorName}`
      : `${count} new messages from ${actorName}`;
  }

  if (notification.type === "CONNECTION_REQUEST")
    return `${actorName} sent a connection request`;
  if (notification.type === "CONNECTION_ACCEPTED")
    return `${actorName} accepted your request`;
  if (notification.type === "POST_LIKE")
    return `${actorName} reacted to your post`;
  if (notification.type === "POST_COMMENT")
    return `${actorName} commented on your post`;
  if (notification.type === "HIRE_CREATED")
    return `${actorName} created a hire update`;
  if (notification.type === "HIRE_COMPLETED")
    return `${actorName} completed a hire update`;

  return actorName;
}

function notificationContext(notification: AppNotification) {
  if (notification.type === "CHAT_MESSAGE") return "Message";
  if (
    notification.type === "POST_COMMENT" ||
    notification.type === "POST_LIKE"
  ) {
    return metadataString(notification, "postTitle") ?? "Post";
  }
  if (
    notification.type === "CONNECTION_REQUEST" ||
    notification.type === "CONNECTION_ACCEPTED"
  )
    return "Connection";
  if (
    notification.type === "HIRE_CREATED" ||
    notification.type === "HIRE_COMPLETED"
  )
    return "Hiring";
  return null;
}

function notificationDetail(notification: AppNotification) {
  if (notification.type === "CHAT_MESSAGE") return null;
  return notification.body || null;
}

function metadataString(notification: AppNotification, key: string) {
  const value = notification.metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function unreadMessageCount(notification: AppNotification) {
  const count = notification.metadata?.unreadCount;
  if (typeof count === "number" && Number.isFinite(count))
    return Math.max(1, count);
  if (typeof count === "string") {
    const parsed = Number(count);
    if (Number.isFinite(parsed)) return Math.max(1, parsed);
  }
  return 1;
}

function prependNotification(
  queryClient: QueryClient,
  notification: AppNotification,
) {
  queryClient.setQueryData<ApiResponse<NotificationPage>>(
    queryKeys.notifications,
    (current) => {
      const existing = current?.content?.data ?? [];
      const nextItems = existing.filter((item) => item.id !== notification.id);
      return {
        ...(current ?? {}),
        content: {
          data: sortNotificationsByActivity([notification, ...nextItems]).slice(
            0,
            previewLimit,
          ),
          nextCursor: current?.content?.nextCursor ?? null,
        },
      };
    },
  );
}

function updateNotificationInCache(
  queryClient: QueryClient,
  notification: AppNotification,
) {
  queryClient.setQueryData<ApiResponse<NotificationPage>>(
    queryKeys.notifications,
    (current) => {
      if (!current?.content) return current;
      return {
        ...current,
        content: {
          ...current.content,
          data: sortNotificationsByActivity(
            current.content.data.map((item) =>
              item.id === notification.id ? notification : item,
            ),
          ),
        },
      };
    },
  );
}

function markCachedNotificationsRead(queryClient: QueryClient) {
  const readAt = new Date().toISOString();
  queryClient.setQueryData<ApiResponse<NotificationPage>>(
    queryKeys.notifications,
    (current) => {
      if (!current?.content) return current;
      return {
        ...current,
        content: {
          ...current.content,
          data: sortNotificationsByActivity(
            current.content.data.map((item) => ({
              ...item,
              readAt: item.readAt ?? readAt,
            })),
          ),
        },
      };
    },
  );
}

function sortNotificationsByActivity(notifications: AppNotification[]) {
  return [...notifications].sort((left, right) => {
    const leftUnread = left.readAt ? 0 : 1;
    const rightUnread = right.readAt ? 0 : 1;
    if (leftUnread !== rightUnread) return rightUnread - leftUnread;

    const timeDifference =
      notificationTimeValue(right) - notificationTimeValue(left);
    if (timeDifference) return timeDifference;
    return right.id - left.id;
  });
}

function notificationActivityTime(notification: AppNotification) {
  return notification.updatedAt ?? notification.createdAt;
}

function notificationTimeValue(notification: AppNotification) {
  const value = new Date(notificationActivityTime(notification)).getTime();
  return Number.isNaN(value) ? 0 : value;
}

function formatNotificationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60_000) return "Just now";
  if (diffMs < 3_600_000)
    return `${Math.max(1, Math.floor(diffMs / 60_000))}m ago`;
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`;
  if (diffMs < 172_800_000) return "Yesterday";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
