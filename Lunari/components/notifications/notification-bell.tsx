"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { useNotifications, type NotificationItem } from "@/lib/hooks/use-notifications";
import { Button } from "@/components/optics/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/optics/dropdown-menu";
import { cn } from "@/lib/utils";

function relativeTime(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function notificationHref(workspaceId: string, item: NotificationItem): string {
  return item.channelId
    ? `/w/${workspaceId}/c/${item.channelId}`
    : `/w/${workspaceId}/dm/${item.dmConversationId}`;
}

export function NotificationBell({
  workspaceId,
  currentUserId,
}: {
  workspaceId: string;
  currentUserId: string;
}) {
  const { items, unreadCount, markAllRead } = useNotifications(currentUserId);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const canRequestPermission =
    typeof window !== "undefined" && typeof Notification !== "undefined" && Notification.permission === "default";

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next: boolean) => {
        setOpen(next);
        if (next) markAllRead();
      }}
    >
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="size-4" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex size-2 rounded-full bg-red-500" />
            )}
            <span className="sr-only">Notifications</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-80 max-w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          Notifications
          {canRequestPermission && (
            <button
              type="button"
              className="text-xs font-normal text-primary hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                Notification.requestPermission();
              }}
            >
              Enable desktop alerts
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">No notifications yet</p>
        )}
        {items.map((item) => (
          <DropdownMenuItem
            key={item.id}
            className="flex flex-col items-start gap-0.5 whitespace-normal py-2"
            onClick={() => router.push(notificationHref(workspaceId, item))}
          >
            <span className="flex w-full items-center gap-1.5 text-xs font-medium text-foreground">
              <span className={cn("size-1.5 rounded-full", item.readAt ? "bg-transparent" : "bg-primary")} />
              {item.actorName}
              {item.channelName && <span className="text-muted-foreground">in #{item.channelName}</span>}
              <span className="ml-auto shrink-0 text-[0.625rem] text-muted-foreground">
                {relativeTime(item.createdAt)}
              </span>
            </span>
            <span className="line-clamp-2 pl-3 text-xs text-muted-foreground">{item.messageBody}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
