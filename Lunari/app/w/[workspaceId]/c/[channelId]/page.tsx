import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChannelHeader } from "@/components/channel/channel-header";
import { ChannelView } from "@/components/messages/channel-view";
import { ForumPostList } from "@/components/forum/forum-post-list";
import type { ForumPost, ForumTag } from "@/lib/types/forum";

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ workspaceId: string; channelId: string }>;
}) {
  const { workspaceId, channelId } = await params;
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: channel } = await supabase
    .from("channels")
    .select("id, name, is_private, type")
    .eq("id", channelId)
    .single();

  if (!channel) redirect(`/w/${workspaceId}`);

  // ── Forum channel ────────────────────────────────────────────
  if (channel.type === "forum") {
    // Fetch posts with author
    const { data: postsData } = await supabase
      .from("forum_posts")
      .select("id, title, body, reply_count, is_pinned, is_closed, last_activity_at, created_at, author_id, profiles!author_id(id, display_name, avatar_url)")
      .eq("channel_id", channelId)
      .order("last_activity_at", { ascending: false });

    const postIds = (postsData ?? []).map((p) => p.id);
    const { data: postTagsData } = await supabase
      .from("forum_post_tags")
      .select("post_id, forum_tags(id, name, color)")
      .in("post_id", postIds.length > 0 ? postIds : ["00000000-0000-0000-0000-000000000000"]);

    const { data: tagsData } = await supabase
      .from("forum_tags")
      .select("id, name, color")
      .eq("channel_id", channelId)
      .order("name");

    type PostRow = {
      id: string; title: string; body: string; reply_count: number;
      is_pinned: boolean; is_closed: boolean; last_activity_at: string;
      created_at: string; author_id: string;
      profiles: { id: string; display_name: string; avatar_url: string | null } | null;
    };
    type TagRow = { post_id: string; forum_tags: ForumTag | null };

    const tagsByPost: Record<string, ForumTag[]> = {};
    for (const row of (postTagsData ?? []) as unknown as TagRow[]) {
      if (!row.forum_tags) continue;
      if (!tagsByPost[row.post_id]) tagsByPost[row.post_id] = [];
      tagsByPost[row.post_id].push(row.forum_tags);
    }

    const posts: ForumPost[] = ((postsData ?? []) as unknown as PostRow[]).map((p) => ({
      id: p.id,
      channel_id: channelId,
      author_id: p.author_id,
      title: p.title,
      body: p.body,
      reply_count: p.reply_count,
      is_pinned: p.is_pinned,
      is_closed: p.is_closed,
      last_activity_at: p.last_activity_at,
      created_at: p.created_at,
      author: p.profiles ?? { id: p.author_id, display_name: "Unknown", avatar_url: null },
      tags: tagsByPost[p.id] ?? [],
    }));

    return (
      <ForumPostList
        channelId={channelId}
        channelName={channel.name}
        workspaceId={workspaceId}
        initialPosts={posts}
        initialTags={(tagsData as ForumTag[]) ?? []}
      />
    );
  }

  // ── Text channel ─────────────────────────────────────────────
  const [{ data: memberData }, { data: myMembership }] = await Promise.all([
    supabase
      .from("workspace_members")
      .select("profiles(id, display_name, avatar_url)")
      .eq("workspace_id", workspaceId),
    supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userData.user.id)
      .single(),
  ]);

  type MemberProfile = { id: string; display_name: string; avatar_url: string | null };
  const memberRows = (memberData ?? []) as unknown as { profiles: MemberProfile | null }[];

  const membersById = Object.fromEntries(
    memberRows
      .map((r) => r.profiles)
      .filter((p): p is MemberProfile => !!p)
      .map((p) => [p.id, { name: p.display_name, avatarUrl: p.avatar_url }])
  );

  const isAdminOrOwner =
    myMembership?.role === "owner" || myMembership?.role === "admin";

  return (
    <ChannelView
      header={<ChannelHeader icon={channel.is_private ? "🔒" : "#"} title={channel.name} />}
      target={{ channelId: channel.id }}
      membersById={membersById}
      currentUserId={userData.user.id}
      isAdminOrOwner={isAdminOrOwner}
      placeholder={`Message #${channel.name}`}
      emptyIcon={channel.is_private ? "🔒" : "#"}
      emptyTitle={`This is the beginning of #${channel.name}`}
    />
  );
}
