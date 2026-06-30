"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/notifications/toast-stack";
import type { Message } from "@/lib/types/database";

type TargetRef = { id: string; label: string };

type ContextValue = {
  unreadByTarget: Record<string, number>;
  unreadByWorkspace: Record<string, number>;
  activeTargetKey: string | null;
};

const WorkspaceActivityContext = createContext<ContextValue>({
  unreadByTarget: {},
  unreadByWorkspace: {},
  activeTargetKey: null,
});

export function useWorkspaceActivity() {
  return useContext(WorkspaceActivityContext);
}

function deriveActiveTargetKey(pathname: string): string | null {
  const channelMatch = pathname.match(/\/c\/([^/]+)/);
  if (channelMatch) return `channel:${channelMatch[1]}`;
  const dmMatch = pathname.match(/\/dm\/([^/]+)/);
  if (dmMatch) return `dm:${dmMatch[1]}`;
  return null;
}

function sumByWorkspace(rows: { workspace_id: string; unread_count: number | string }[]) {
  const next: Record<string, number> = {};
  for (const row of rows) {
    next[row.workspace_id] = (next[row.workspace_id] ?? 0) + Number(row.unread_count);
  }
  return next;
}

export function WorkspaceActivityProvider({
  workspaceId,
  currentUserId,
  channels,
  dms,
  membersById,
  children,
}: {
  workspaceId: string;
  currentUserId: string;
  channels: TargetRef[];
  dms: TargetRef[];
  membersById: Record<string, string>;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { showToast } = useToast();
  const activeTargetKey = deriveActiveTargetKey(pathname ?? "");
  // Read inside the realtime handler via ref rather than as an effect
  // dependency — depending on activeTargetKey directly would tear down and
  // recreate the channel subscription on every navigation, opening a window
  // where an in-flight event arrives mid-resubscribe and gets dropped.
  const activeTargetKeyRef = useRef(activeTargetKey);
  useEffect(() => {
    activeTargetKeyRef.current = activeTargetKey;
  }, [activeTargetKey]);

  const [unreadByTarget, setUnreadByTarget] = useState<Record<string, number>>({});
  const [unreadByWorkspace, setUnreadByWorkspace] = useState<Record<string, number>>({});

  const targetLabels = useMemo(() => {
    const map = new Map<string, string>();
    channels.forEach((c) => map.set(`channel:${c.id}`, `#${c.label}`));
    dms.forEach((d) => map.set(`dm:${d.id}`, d.label));
    return map;
  }, [channels, dms]);

  // Initial unread snapshot for the open workspace.
  useEffect(() => {
    const supabase = createClient();
    supabase
      .rpc("get_unread_counts", { _workspace_id: workspaceId })
      .then(({ data }: { data: { target_type: string; target_id: string; unread_count: number }[] | null }) => {
        const next: Record<string, number> = {};
        for (const row of data ?? []) {
          next[`${row.target_type}:${row.target_id}`] = Number(row.unread_count);
        }
        setUnreadByTarget(next);
      });
  }, [workspaceId]);

  // Initial cross-workspace totals, for the switcher's per-workspace dots.
  useEffect(() => {
    const supabase = createClient();
    supabase
      .rpc("get_workspace_unread_totals")
      .then(({ data }: { data: { workspace_id: string; unread_count: number }[] | null }) => {
        setUnreadByWorkspace(sumByWorkspace(data ?? []));
      });
  }, [workspaceId]);

  // Live updates: any message INSERT this user can see (RLS-scoped, so this
  // never delivers rows the caller couldn't already SELECT). Filtered
  // client-side against this workspace's known channel/DM ids since a
  // brand-new channel with zero prior messages wouldn't show up in the
  // unread RPC's result set yet, but still needs to register here.
  useEffect(() => {
    const supabase = createClient();
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let refetchTimeout: ReturnType<typeof setTimeout> | null = null;

    const refetchWorkspaceTotals = () => {
      if (refetchTimeout) clearTimeout(refetchTimeout);
      refetchTimeout = setTimeout(() => {
        supabase
          .rpc("get_workspace_unread_totals")
          .then(({ data }: { data: { workspace_id: string; unread_count: number }[] | null }) => {
            setUnreadByWorkspace(sumByWorkspace(data ?? []));
          });
      }, 600);
    };

    // Must await session hydration before subscribing, or the channel joins
    // under anonymous auth and RLS silently drops every event even though
    // the channel reports SUBSCRIBED (see use-messages.ts).
    supabase.auth.getSession().then(() => {
      if (!active) return;

      channel = supabase
        .channel(`activity-${currentUserId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          (payload) => {
            const message = payload.new as Message;
            if (message.sender_id === currentUserId) return;

            const targetKey = message.channel_id
              ? `channel:${message.channel_id}`
              : `dm:${message.dm_conversation_id}`;

            if (!targetLabels.has(targetKey)) {
              // Not a channel/DM in this workspace — still might affect
              // another workspace's total, so refresh those, but skip the
              // per-target badge and toast below.
              refetchWorkspaceTotals();
              return;
            }

            refetchWorkspaceTotals();

            if (targetKey === activeTargetKeyRef.current) return;

            setUnreadByTarget((prev) => ({ ...prev, [targetKey]: (prev[targetKey] ?? 0) + 1 }));

            const senderName = membersById[message.sender_id] ?? "Someone";
            const label = targetLabels.get(targetKey) ?? "";
            const isDm = targetKey.startsWith("dm:");

            showToast({
              title: isDm ? senderName : `${senderName} in ${label}`,
              description: message.body || (message.attachment_url ? "Sent an attachment" : undefined),
              onClick: () => {
                const [type, id] = targetKey.split(":");
                router.push(`/w/${workspaceId}/${type === "channel" ? "c" : "dm"}/${id}`);
              },
            });

            if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.hidden) {
              new Notification(isDm ? senderName : `${senderName} in ${label}`, {
                body: message.body || undefined,
              });
            }
          }
        )
        .subscribe();
    });

    return () => {
      active = false;
      if (refetchTimeout) clearTimeout(refetchTimeout);
      if (channel) supabase.removeChannel(channel);
    };
  }, [currentUserId, workspaceId, targetLabels, membersById, showToast, router]);

  // Opening a channel/DM marks it read.
  const markedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeTargetKey || markedRef.current === activeTargetKey) return;
    markedRef.current = activeTargetKey;

    setUnreadByTarget((prev) => (prev[activeTargetKey] ? { ...prev, [activeTargetKey]: 0 } : prev));

    const [type, id] = activeTargetKey.split(":");
    const supabase = createClient();
    // Plain .upsert() can't target message_reads' partial unique indexes
    // (see 0004_mark_read_rpc.sql) — must go through the RPC instead.
    supabase
      .rpc("mark_read", {
        _channel_id: type === "channel" ? id : null,
        _dm_conversation_id: type === "dm" ? id : null,
      })
      .then();
  }, [activeTargetKey, currentUserId]);

  const value = useMemo(
    () => ({ unreadByTarget, unreadByWorkspace, activeTargetKey }),
    [unreadByTarget, unreadByWorkspace, activeTargetKey]
  );

  return <WorkspaceActivityContext.Provider value={value}>{children}</WorkspaceActivityContext.Provider>;
}
