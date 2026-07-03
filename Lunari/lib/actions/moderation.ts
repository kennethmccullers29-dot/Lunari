"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function changeMemberRole(
  workspaceId: string,
  userId: string,
  newRole: "admin" | "member"
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("change_member_role", {
    p_workspace_id: workspaceId,
    p_user_id: userId,
    p_new_role: newRole,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/w/${workspaceId}`, "layout");
}

export async function removeMember(
  workspaceId: string,
  userId: string
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_workspace_member", {
    p_workspace_id: workspaceId,
    p_user_id: userId,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/w/${workspaceId}`, "layout");
}
