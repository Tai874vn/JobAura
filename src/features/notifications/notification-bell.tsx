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
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useRealtimeConnection } from "@/features/auth/realtime-provider";
import { useSession } from "@/features/auth/use-session";
import { chatApi, notificationsApi } from "@/shared/api/endpoints";
import { normalizeNotification } from "@/shared/api/normalizers";
import { queryKeys } from "@/shared/api/query-keys";
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
  notificationTarget,
} from "./notification-display";
import { NotificationSection, NotificationSkeleton } from "./notification-list";

const previewLimit = 8;

export function NotificationBell() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const connection = useRealtimeConnection();
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
    if (!userId || !connection) return;
    return connection.subscribe("/notifications", (socket) => {
      const onNotification = (raw: unknown) => {
        const notification = normalizeNotification(raw);
        prependNotification(queryClient, notification, previewLimit);
      };
      const onUnreadCount = ({ unreadCount }: { unreadCount: number }) => {
        queryClient.setQueryData<ApiResponse<{ unreadCount: number }>>(
          queryKeys.notificationUnreadCount,
          (current) => ({
            ...(current ?? {}),
            content: { unreadCount },
          }),
        );
      };

      socket.on("notification:new", onNotification);
      socket.on("notifications:unread-count", onUnreadCount);
      return () => {
        socket.off("notification:new", onNotification);
        socket.off("notifications:unread-count", onUnreadCount);
      };
    });
  }, [connection, queryClient, userId]);

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

    const actionUrl = notificationTarget(notification);
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
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-danger px-1.5 py-0.5 text-xs font-medium leading-none text-white">
            {badge}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div id="notification-panel" className="motion-popover fixed inset-x-4 top-[4.5rem] z-50 overflow-hidden sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-[420px] sm:max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-surface shadow-overlay">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <h2 className="font-display text-lg font-medium">Notifications</h2>
              <p className="text-xs font-medium text-muted">
                {unreadCount
                  ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}`
                  : "All caught up"}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              loading={markAllRead.isPending}
              disabled={!unreadCount}
              onClick={() => markAllRead.mutate()}
            >
              <CheckCheck className="h-4 w-4" />
              Mark all
            </Button>
          </div>

          <div className="max-h-[460px] overflow-y-auto p-2">
            {listQuery.isPending ? (
              <NotificationSkeleton />
            ) : listQuery.isError ? (
              <div className="p-6 text-center text-sm text-muted">
                Notifications could not be loaded.
                <Button className="mt-3" size="sm" variant="secondary" loading={listQuery.isFetching} onClick={() => listQuery.refetch()}>Retry</Button>
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
                <p className="mt-3 text-sm font-medium">
                  No notifications yet
                </p>
                <p className="mt-1 text-xs text-muted">
                  Connection, post, contract, and chat updates will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
