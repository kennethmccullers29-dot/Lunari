"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createPost(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Not signed in" };

  const channelId = String(formData.get("channel_id") ?? "");
  const workspaceId = String(formData.get("workspace_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const tagIds = formData.getAll("tag_ids").map(String).filter(Boolean);

  if (!title) return { error: "Title is required" };

  const { data: postId, error } = await supabase.rpc("create_forum_post", {
    _channel_id: channelId,
    _title: title,
    _body: body,
    _tag_ids: tagIds.length > 0 ? tagIds : [],
  });

  if (error || !postId) return { error: error?.message ?? "Could not create post" };

  revalidatePath(`/w/${workspaceId}/c/${channelId}`);
  redirect(`/w/${workspaceId}/c/${channelId}/${postId}`);
}

export async function addReply(
  postId: string,
  body: string
): Promise<{ id: string; created_at: string } | { error: string }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Not signed in" };

  const { data, error } = await supabase
    .from("forum_replies")
    .insert({ post_id: postId, author_id: userData.user.id, body })
    .select("id, created_at")
    .single();

  if (error || !data) return { error: error?.message ?? "Could not post reply" };
  return { id: data.id, created_at: data.created_at };
}

export async function deleteReply(replyId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("forum_replies").delete().eq("id", replyId);
  if (error) return { error: error.message };
  return {};
}

export async function deletePost(
  postId: string,
  workspaceId: string,
  channelId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("forum_posts").delete().eq("id", postId);
  if (error) return { error: error.message };
  revalidatePath(`/w/${workspaceId}/c/${channelId}`);
  redirect(`/w/${workspaceId}/c/${channelId}`);
}

export async function createTag(
  channelId: string,
  name: string,
  color: string
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("forum_tags")
    .insert({ channel_id: channelId, name: name.trim(), color })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not create tag" };
  return { id: data.id };
}

export async function deleteTag(tagId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("forum_tags").delete().eq("id", tagId);
  if (error) return { error: error.message };
  return {};
}
