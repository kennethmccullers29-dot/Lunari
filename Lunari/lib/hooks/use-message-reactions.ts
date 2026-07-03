"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { targetColumn, type Target } from "@/lib/hooks/use-messages";
import type { MessageReaction } from "@/lib/types/database";

export interface ReactionPill {
  emoji: string;
  count: number;
  reactedByMe: boolean;
  reactorIds: string[];
}

export function useMessageReactions(target: Target) {
  const { column, id } = targetColumn(target);
  const [rows, setRows] = useState<MessageReaction[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    supabase
      .from("message_reactions")
      .select("*")
      .eq(column, id)
      .then(({ data }) => {
        if (active) setRows(data ?? []);
      });

    // See use-messages.ts: must await session hydration before subscribing,
    // or the channel joins under anonymous auth and RLS silently drops
    // every event even though the channel reports SUBSCRIBED.
    supabase.auth.getSession().then(() => {
      if (!active) return;

      channel = supabase
        .channel(`reactions-${column}-${id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "message_reactions", filter: `${column}=eq.${id}` },
          (payload) => {
            if (payload.eventType === "INSERT") {
              const row = payload.new as MessageReaction;
              setRows((prev) => (prev.some((r) => r.id === row.id) ? prev : [...prev, row]));
            } else if (payload.eventType === "DELETE") {
              const row = payload.old as MessageReaction;
              setRows((prev) => prev.filter((r) => r.id !== row.id));
            }
          }
        )
        .subscribe();
    });

    return () => {
      active = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [column, id]);

  const reactionsByMessageId = useMemo(() => {
    const map: Record<string, ReactionPill[]> = {};
    for (const row of rows) {
      const pills = (map[row.message_id] ??= []);
      const pill = pills.find((p) => p.emoji === row.emoji);
      if (pill) {
        pill.count += 1;
        pill.reactorIds.push(row.user_id);
        if (row.user_id === currentUserId) pill.reactedByMe = true;
      } else {
        pills.push({
          emoji: row.emoji,
          count: 1,
          reactedByMe: row.user_id === currentUserId,
          reactorIds: [row.user_id],
        });
      }
    }
    return map;
  }, [rows, currentUserId]);

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!currentUserId) return;
    const supabase = createClient();
    const existing = rows.find(
      (r) => r.message_id === messageId && r.emoji === emoji && r.user_id === currentUserId
    );

    if (existing) {
      await supabase.from("message_reactions").delete().eq("id", existing.id);
    } else {
      const { error } = await supabase.from("message_reactions").insert({
        message_id: messageId,
        user_id: currentUserId,
        emoji,
        [column]: id,
      });
      // 23505 = unique_violation: a duplicate insert race (e.g. double-click)
      // is harmless — the row already exists, nothing to do.
      if (error && error.code !== "23505") throw error;
    }
  };

  return { reactionsByMessageId, toggleReaction };
}
