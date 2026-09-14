"use client";

import { useEffect, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Bell,
  CheckCheck,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { Socket } from "socket.io-client";
import { toast } from "sonner";
import { useSession } from "@/features/auth/use-session";
import { chatApi, notificationsApi } from "@/shared/api/endpoints";
import { normalizeNotification } from "@/shared/api/normalizers";
import { queryKeys } from "@/shared/api/query-keys";
import { resolveClientOrigin } from "@/shared/config/client-origin";
import { env } from "@/shared/config/env";
import type { ApiResponse, AppNotification } from "@/shared/schemas";
import { useChatStore } from "@/shared/stores/chat-store";
import { Button } from "@/shared/ui";
import {
  markCachedNotificationsRead,
  prependNotification,
  sortNotificationsByActivity,
  updateNotificationInCache,
} from "./notification-cache";
import {
  roomIdFromNotification,
  safeInternalActionUrl,
} from "./notification-display";
import { NotificationSection, NotificationSkeleton } from "./notification-list";

const previewLimit = 8;

export function NotificationBell() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const userId = user?.id;
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
    let socket: Socket | undefined;
    let cancelled = false;

    async function connect() {
      const { io } = await import("socket.io-client");
      if (cancelled) return;

      const socketOrigin = resolveClientOrigin(
        env.apiBaseUrl,
        env.useSameOriginApi,
        window.location.origin,
      );
      socket = io(`${socketOrigin}/notifications`, {
        withCredentials: true,
        autoConnect: true,
        transports: ["websocket", "polling"],
      });

      socket.on("notification:new", (raw: unknown) => {
        const notification = normalizeNotification(raw);
        prependNotification(queryClient, notification, previewLimit);
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
    }

    void connect();

    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, [queryClient, userId]);

  async function openNotification(notification: AppNotification) {
    if (!notification.readAt) {
      try {
        await markRead.mutateAsync(notification.id);
      } catch {
        // The mutation already reports the failure. Navigation should still work.
      }
    }
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
        aria-label={open ? "Close notifications" : "Open notifications"}
        aria-expanded={open}
        aria-controls="notification-panel"
      >
        <Bell className="h-4 w-4" />
        {unreadCount ? (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
            {badge}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div id="notification-panel" className="absolute right-0 top-11 z-50 w-[420px] max-w-[calc(100vw-24px)] overflow-hidden rounded-lg border border-border bg-white shadow-[0_18px_50px_rgba(0,0,0,0.16)]">
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
