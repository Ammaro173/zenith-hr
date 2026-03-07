"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { env } from "@/lib/env";
import { client, orpc } from "@/utils/orpc";

interface NotificationItem {
  body: string;
  createdAt: string | Date;
  id: string;
  link?: string | null;
  readAt: string | Date | null;
  title: string;
}

export function NotificationBell() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  const queryClient = useQueryClient();

  // oRPC integration for fetching initial list and marking as read
  const { data: notificationsData, refetch } = useQuery({
    ...orpc.notifications.list.queryOptions({
      input: { limit: 10 },
    }),
  });

  const notifications = notificationsData?.items || [];

  const { mutateAsync: markAsRead } = useMutation({
    mutationFn: (input: { id: string }) =>
      client.notifications.markAsRead(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Update unread count when notifications data changes
  useEffect(() => {
    if (notificationsData?.unreadCount !== undefined) {
      setUnreadCount(notificationsData.unreadCount);
    }
  }, [notificationsData?.unreadCount]);

  // Server-Sent Events setup
  useEffect(() => {
    const sseUrl = `${env.NEXT_PUBLIC_SERVER_URL}/api/notifications/stream`;
    const eventSource = new EventSource(sseUrl, {
      withCredentials: true,
    });

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "ping" || data.type === "connected") {
          return;
        }

        // When a real notification arrives
        toast(data.title, {
          description: data.body,
          action: data.link
            ? {
                label: "View Details",
                onClick: () => router.push(data.link as Route),
              }
            : undefined,
        });

        setUnreadCount((prev) => prev + 1);
        refetch();
      } catch (err) {
        console.error("Failed to parse SSE notification", err);
      }
    };

    eventSource.onerror = () => {
      // EventSource auto-reconnects. We silence the error log to avoid console spam
      // since the browser handles reconnection automatically.
      if (eventSource.readyState === EventSource.CLOSED) {
        console.warn("SSE Connection Closed. Attempting to reconnect...");
      }
    };

    return () => {
      eventSource.close();
    };
  }, [refetch, router]);

  const handleNotificationClick = async (notification: NotificationItem) => {
    if (!notification.readAt) {
      await markAsRead({ id: notification.id });
      setUnreadCount((prev) => Math.max(0, prev - 1));
      refetch();
    }

    if (notification.link) {
      router.push(notification.link as Route);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="relative h-9 w-9 rounded-full border border-border/50 bg-background/80 shadow-sm transition-all hover:bg-background"
          size="icon"
          variant="ghost"
        >
          <Bell className="h-4 w-4 text-muted-foreground transition-all hover:text-foreground" />
          {unreadCount > 0 && (
            <div className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-red-500" />
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="slide-in-from-top-2 w-[320px] max-w-[90vw] animate-in border-border/60 bg-background/95 p-0 shadow-lg backdrop-blur-sm"
      >
        <DropdownMenuLabel className="flex items-center justify-between p-3 font-semibold text-sm">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary text-xs">
              {unreadCount} new
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0 bg-border/60" />

        <div className="max-h-87.5 overflow-y-auto">
          {notifications?.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No notifications yet.
            </div>
          ) : (
            notifications?.map((notification: NotificationItem) => (
              <DropdownMenuItem
                className={`flex cursor-pointer flex-col items-start gap-1 rounded-none border-border/40 border-b p-3 transition-all last:border-0 focus:bg-accent/80 ${
                  notification.readAt ? "" : "bg-primary/5"
                }`}
                key={notification.id}
                onSelect={(e) => {
                  e.preventDefault();
                  handleNotificationClick(notification);
                }}
              >
                <div className="flex w-full items-start justify-between">
                  <span
                    className={`font-medium text-sm ${notification.readAt ? "text-muted-foreground" : "text-foreground"}`}
                  >
                    {notification.title}
                  </span>
                  {!notification.readAt && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </div>
                <p className="line-clamp-2 text-muted-foreground text-xs">
                  {notification.body}
                </p>
                <span className="mt-1 text-[10px] text-muted-foreground/70">
                  {new Date(notification.createdAt).toLocaleDateString(
                    undefined,
                    {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    },
                  )}
                </span>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
