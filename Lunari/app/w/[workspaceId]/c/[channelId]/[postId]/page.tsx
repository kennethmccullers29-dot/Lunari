import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ForumPostView } from "@/components/forum/forum-post-view";
import type { ForumPost, ForumReply, ForumTag } from "@/lib/types/forum";

export default async function ForumPostPage({
  params,
}: {
  params: Promise<{ workspaceId: string; channelId: string; postId: string }>;
}) {
  const { workspaceId, channelId, postId } = await params;
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  // Fetch post with author
  const { data: postData } = await supabase
    .from("forum_posts")
    .select("id, title, body, reply_count, is_pinned, is_closed, last_activity_at, created_at, author_id, profiles!author_id(id, display_name, avatar_url)")
    .eq("id", postId)
    .single();

  if (!postData) redirect(`/w/${workspaceId}/c/${channelId}`);

  // Fetch post tags
  const { data: postTagsData } = await supabase
    .from("forum_post_tags")
    .select("forum_tags(id, name, color)")
    .eq("post_id", postId);

  // Fetch replies with author
  const { data: repliesData } = await supabase
    .from("forum_replies")
    .select("id, post_id, author_id, body, created_at, profiles!author_id(id, display_name, avatar_url)")
    .eq("post_id", postId)
    .order("created_at");

  // Fetch channel name for breadcrumb
  const { data: channelData } = await supabase
    .from("channels")
    .select("name")
    .eq("id", channelId)
    .single();

  // Fetch current user profile
  const { data: profileData } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .eq("id", userData.user.id)
    .single();

  type AuthorRow = { id: string; display_name: string; avatar_url: string | null };
  type PostRow = typeof postData & { profiles: AuthorRow | null };
  type ReplyRow = {
    id: string; post_id: string; author_id: string; body: string;
    created_at: string; profiles: AuthorRow | null;
  };
  type TagJoinRow = { forum_tags: ForumTag | null };

  const tags: ForumTag[] = ((postTagsData ?? []) as unknown as TagJoinRow[])
    .map((r) => r.forum_tags)
    .filter((t): t is ForumTag => !!t);

  const p = postData as unknown as PostRow;
  const post: ForumPost = {
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
    tags,
  };

  const replies: ForumReply[] = ((repliesData ?? []) as unknown as ReplyRow[]).map((r) => ({
    id: r.id,
    post_id: r.post_id,
    author_id: r.author_id,
    body: r.body,
    created_at: r.created_at,
    author: r.profiles ?? { id: r.author_id, display_name: "Unknown", avatar_url: null },
  }));

  const currentUser = profileData ?? {
    id: userData.user.id,
    display_name: userData.user.email ?? "Me",
    avatar_url: null,
  };

  return (
    <ForumPostView
      post={post}
      replies={replies}
      channelId={channelId}
      channelName={channelData?.name ?? "forum"}
      workspaceId={workspaceId}
      currentUser={currentUser}
    />
  );
}
