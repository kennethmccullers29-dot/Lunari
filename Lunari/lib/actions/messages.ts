"use server";

import { createClient } from "@/lib/supabase/server";

export async function editMessage(messageId: string, body: string): Promise<void> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("messages")
    .update({ body: body.trim(), edited_at: new Date().toISOString() })
    .eq("id", messageId)
    .eq("sender_id", userData.user.id);

  if (error) throw new Error(error.message);
}

export async function deleteMessage(messageId: string): Promise<void> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("messages")
    .delete()
    .eq("id", messageId)
    .eq("sender_id", userData.user.id);

  if (error) throw new Error(error.message);
}

// For admin/owner deleting any channel message — calls a SECURITY DEFINER RPC
// that verifies the caller's workspace role before deleting.
export async function adminDeleteMessage(messageId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_delete_message", {
    p_message_id: messageId,
  });
  if (error) throw new Error(error.message);
}
