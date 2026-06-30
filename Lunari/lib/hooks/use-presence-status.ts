"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ProfileStatus } from "@/lib/types/database";

export function usePresenceStatus(
  currentUserId: string,
  initialMembers: { id: string; status: ProfileStatus }[]
) {
  const [statuses, setStatuses] = useState<Record<string, ProfileStatus>>(() =>
    Object.fromEntries(initialMembers.map((m) => [m.id, m.status]))
  );

  useEffect(() => {
    const supabase = createClient();

    const setOwnStatus = (status: ProfileStatus) => {
      supabase.from("profiles").update({ status }).eq("id", currentUserId).then();
    };

    setOwnStatus("active");
    const onVisibility = () => setOwnStatus(document.hidden ? "away" : "active");
    document.addEventListener("visibilitychange", onVisibility);

    const channel = supabase
      .channel(`profile-status-${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          const row = payload.new as { id: string; status: ProfileStatus };
          setStatuses((prev) => ({ ...prev, [row.id]: row.status }));
        }
      )
      .subscribe();

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  return statuses;
}
