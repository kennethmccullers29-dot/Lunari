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

type Attachment = {
  url: string;
  type: "image" | "gif" | "file" | "voice";
  name?: string;
};

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
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "messages", filter: `${column}=eq.${id}` },
          (payload) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === (payload.new as Message).id ? (payload.new as Message) : m
              )
            );
          }
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "messages", filter: `${column}=eq.${id}` },
          (payload) => {
            const deletedId = (payload.old as { id: string }).id;
            setMessages((prev) => prev.filter((m) => m.id !== deletedId));
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
    async (body: string, attachment?: Attachment, mentionIds: string[] = []) => {
      const trimmed = body.trim();
      if (!trimmed && !attachment) return;

      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: msgData } = await supabase
        .from("messages")
        .insert({
          body: trimmed,
          sender_id: userData.user.id,
          [column]: id,
          ...(attachment
            ? {
                attachment_url: attachment.url,
                attachment_type: attachment.type,
                ...(attachment.name ? { attachment_name: attachment.name } : {}),
              }
            : {}),
        })
        .select("id")
        .single();

      // Notify mentioned users
      if (msgData && mentionIds.length > 0) {
        const notifications = mentionIds
          .filter((uid) => uid !== userData.user!.id)
          .map((uid) => ({
            user_id: uid,
            actor_id: userData.user!.id,
            message_id: msgData.id,
            channel_id: "channelId" in target ? target.channelId : null,
            dm_conversation_id:
              "dmConversationId" in target ? target.dmConversationId : null,
          }));

        if (notifications.length > 0) {
          await supabase.from("notifications").insert(notifications);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [column, id]
  );

  return { messages, sendMessage, loading };
}
