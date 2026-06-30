"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type VoiceParticipant = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
};

export function useVoicePresence(channelId: string, self?: VoiceParticipant) {
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);

  useEffect(() => {
    const supabase = createClient();
    const presenceChannel = supabase.channel(`voice-presence-${channelId}`, {
      config: { presence: { key: self?.userId ?? "" } },
    });

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState<VoiceParticipant>();
        const list = Object.values(state)
          .flat()
          .filter((p) => !!p.userId)
          .map(({ userId, displayName, avatarUrl }) => ({ userId, displayName, avatarUrl }));
        setParticipants(list);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && self) {
          await presenceChannel.track(self);
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [channelId, self?.userId]);

  return participants;
}
