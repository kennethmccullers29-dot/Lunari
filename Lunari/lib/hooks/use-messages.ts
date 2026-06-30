"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/lib/types/database";

export type Target = { channelId: string } | { dmConversationId: string };

export function targetColumn(target: Target) {
  return "channelId" in target
    ? { column: "channel_id" as const, id: target.channelId }
    : { column: "dm_conversation_id" as const, id: target.dmConversationId };
}

type Attachment = { url: string; type: "image" | "gif" };

export function useMessages(target: Target) {
  const { column, id } = targetColumn(target);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    supabase
      .from("messages")
      .select("*")
      .eq(column, id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (!active) return;
        setMessages([...(data ?? [])].reverse());
        setLoading(false);
      });

    // Realtime's websocket auth is set from the session access token. If we
    // subscribe before the session has finished hydrating from cookies, the
    // channel joins under anonymous auth — it reports SUBSCRIBED, but RLS
    // then silently drops every change event since auth.uid() is null.
    // Awaiting getSession() first guarantees the token is set before join.
    supabase.auth.getSession().then(() => {
      if (!active) return;

      channel = supabase
        .channel(`messages-${column}-${id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `${column}=eq.${id}` },
          (payload) => {
            setMessages((prev) => [...prev, payload.new as Message]);
          }
        )
        .subscribe();
    });

    return () => {
      active = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [column, id]);

  const sendMessage = useCallback(
    async (body: string, attachment?: Attachment) => {
      const trimmed = body.trim();
      if (!trimmed && !attachment) return;

      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      await supabase.from("messages").insert({
        body: trimmed,
        sender_id: userData.user.id,
        [column]: id,
        ...(attachment
          ? { attachment_url: attachment.url, attachment_type: attachment.type }
          : {}),
      });
    },
    [column, id]
  );

  return { messages, sendMessage, loading };
}
