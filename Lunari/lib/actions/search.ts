"use server";

import { createClient } from "@/lib/supabase/server";

export type SearchResult = {
  messages: {
    id: string;
    body: string;
    createdAt: string;
    senderName: string;
    channelId: string | null;
    channelName: string | null;
    dmConversationId: string | null;
  }[];
  channels: {
    id: string;
    name: string;
    isPrivate: boolean;
    type: string;
  }[];
  members: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    status: string;
    title: string | null;
  }[];
};

export async function searchWorkspace(
  workspaceId: string,
  query: string
): Promise<SearchResult> {
  const q = query.trim();
  if (q.length < 2) return { messages: [], channels: [], members: [] };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { messages: [], channels: [], members: [] };

  const pattern = `%${q}%`;

  // Collect channel IDs accessible to this user in the workspace
  const { data: channelRows } = await supabase
    .from("channels")
    .select("id")
    .eq("workspace_id", workspaceId);

  const channelIds = (channelRows ?? []).map((c) => c.id);

  const [msgResult, channelResult, memberResult] = await Promise.all([
    // Messages (channel-based only, workspace-scoped)
    channelIds.length > 0
      ? supabase
          .from("messages")
          .select(
            "id, body, created_at, channel_id, dm_conversation_id, profiles!sender_id(display_name), channels(name)"
          )
          .in("channel_id", channelIds)
          .ilike("body", pattern)
          .order("created_at", { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] }),

    // Channels matching the query
    supabase
      .from("channels")
      .select("id, name, is_private, type")
      .eq("workspace_id", workspaceId)
      .ilike("name", pattern)
      .order("name")
      .limit(5),

    // All workspace members (filter by query client-side)
    supabase
      .from("workspace_members")
      .select("profiles(id, display_name, avatar_url, status, title)")
      .eq("workspace_id", workspaceId),
  ]);

  type MsgRow = {
    id: string;
    body: string;
    created_at: string;
    channel_id: string | null;
    dm_conversation_id: string | null;
    profiles: { display_name: string } | null;
    channels: { name: string } | null;
  };

  const messages = ((msgResult.data ?? []) as unknown as MsgRow[]).map((m) => ({
    id: m.id,
    body: m.body,
    createdAt: m.created_at,
    senderName: m.profiles?.display_name ?? "Unknown",
    channelId: m.channel_id,
    channelName: m.channels?.name ?? null,
    dmConversationId: m.dm_conversation_id,
  }));

  type ChanRow = { id: string; name: string; is_private: boolean; type: string };
  const channels = ((channelResult.data ?? []) as ChanRow[]).map((c) => ({
    id: c.id,
    name: c.name,
    isPrivate: c.is_private,
    type: c.type,
  }));

  type MemberRow = {
    profiles: {
      id: string;
      display_name: string;
      avatar_url: string | null;
      status: string;
      title: string | null;
    } | null;
  };
  const qLower = q.toLowerCase();
  const members = ((memberResult.data ?? []) as unknown as MemberRow[])
    .map((r) => r.profiles)
    .filter(
      (p): p is NonNullable<MemberRow["profiles"]> =>
        !!p && p.display_name.toLowerCase().includes(qLower)
    )
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      displayName: p.display_name,
      avatarUrl: p.avatar_url,
      status: p.status,
      title: p.title,
    }));

  return { messages, channels, members };
}
