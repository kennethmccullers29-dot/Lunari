"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createWikiPage(workspaceId: string): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("wiki_pages")
    .insert({ workspace_id: workspaceId, created_by: user.id, updated_by: user.id })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Could not create page" };

  revalidatePath(`/w/${workspaceId}/wiki`);
  return { id: data.id };
}

export async function updateWikiPage(
  pageId: string,
  fields: { title?: string; icon?: string; content?: object }
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("wiki_pages")
    .update({ ...fields, updated_by: user.id })
    .eq("id", pageId);

  if (error) return { error: error.message };
  return {};
}

export async function deleteWikiPage(pageId: string, workspaceId: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase.from("wiki_pages").delete().eq("id", pageId);
  if (error) return { error: error.message };

  revalidatePath(`/w/${workspaceId}/wiki`);
  redirect(`/w/${workspaceId}/wiki`);
}
