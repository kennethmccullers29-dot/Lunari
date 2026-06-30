"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { targetColumn, type Target } from "@/lib/hooks/use-messages";

const TYPING_TIMEOUT_MS = 3000;
const SEND_THROTTLE_MS = 2000;

export function useTypingIndicator(target: Target, currentUserId: string) {
  const { column, id } = targetColumn(target);
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const clearTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const lastSentRef = useRef(0);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`typing-${column}-${id}`)
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const userId = (payload as { userId?: string }).userId;
        if (!userId || userId === currentUserId) return;

        setTypingUserIds((prev) => (prev.includes(userId) ? prev : [...prev, userId]));

        clearTimeout(clearTimeoutsRef.current[userId]);
        clearTimeoutsRef.current[userId] = setTimeout(() => {
          setTypingUserIds((prev) => prev.filter((u) => u !== userId));
        }, TYPING_TIMEOUT_MS);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      Object.values(clearTimeoutsRef.current).forEach(clearTimeout);
      clearTimeoutsRef.current = {};
      setTypingUserIds([]);
      supabase.removeChannel(channel);
    };
  }, [column, id, currentUserId]);

  const notifyTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastSentRef.current < SEND_THROTTLE_MS) return;
    lastSentRef.current = now;

    channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: currentUserId },
    });
  }, [currentUserId]);

  return { typingUserIds, notifyTyping };
}
