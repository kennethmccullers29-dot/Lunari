"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function startDm(formData: FormData) {
  const workspaceId = String(formData.get("workspace_id") ?? "");
  const otherUserIds = formData.getAll("member_ids").map(String);

  if (!workspaceId || otherUserIds.length === 0) {
    redirect(`/w/${workspaceId}?error=Pick at least one person`);
  }

  const supabase = await createClient();
  const { data: conversation, error } = await supabase.rpc("start_dm", {
    _workspace_id: workspaceId,
    _other_user_ids: otherUserIds,
  });

  if (error || !conversation) {
    redirect(
      `/w/${workspaceId}?error=${encodeURIComponent(error?.message ?? "Could not start conversation")}`
    );
  }

  redirect(`/w/${workspaceId}/dm/${conversation.id}`);
}
