"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Notification as NotificationRow } from "@/lib/types/database";

export interface NotificationItem {
  id: string;
  createdAt: string;
  readAt: string | null;
  actorName: string;
  channelId: string | null;
  channelName: string | null;
  dmConversationId: string | null;
  messageBody: string;
}

type NotificationQueryRow = {
  id: string;
  created_at: string;
  read_at: string | null;
  channel_id: string | null;
  dm_conversation_id: string | null;
  actor: { display_name: string } | null;
  messages: { body: string } | null;
  channels: { name: string } | null;
};

function mapRow(row: NotificationQueryRow): NotificationItem {
  return {
    id: row.id,
    createdAt: row.created_at,
    readAt: row.read_at,
    actorName: row.actor?.display_name ?? "Someone",
    channelId: row.channel_id,
    channelName: row.channels?.name ?? null,
    dmConversationId: row.dm_conversation_id,
    messageBody: row.messages?.body ?? "",
  };
}

const SELECT = `
  id, created_at, read_at, channel_id, dm_conversation_id,
  actor:profiles!notifications_actor_id_fkey(display_name),
  messages(body),
  channels(name)
`;

export function useNotifications(currentUserId: string) {
  const [items, setItems] = useState<NotificationItem[]>([]);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    supabase
      .from("notifications")
      .select(SELECT)
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (active) setItems(((data ?? []) as unknown as NotificationQueryRow[]).map(mapRow));
      });

    supabase.auth.getSession().then(() => {
      if (!active) return;

      channel = supabase
        .channel(`notifications-${currentUserId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${currentUserId}` },
          (payload) => {
            const row = payload.new as NotificationRow;
            supabase
              .from("notifications")
              .select(SELECT)
              .eq("id", row.id)
              .single()
              .then(({ data }) => {
                if (active && data) {
                  setItems((prev) => [mapRow(data as unknown as NotificationQueryRow), ...prev].slice(0, 30));
                }
              });
          }
        )
        .subscribe();
    });

    return () => {
      active = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const markAllRead = useCallback(() => {
    setItems((prev) => prev.map((item) => (item.readAt ? item : { ...item, readAt: new Date().toISOString() })));
    const supabase = createClient();
    supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null).then();
  }, []);

  const unreadCount = items.filter((item) => !item.readAt).length;

  return { items, unreadCount, markAllRead };
}
