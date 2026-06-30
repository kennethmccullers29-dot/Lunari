"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(
  formData: FormData
): Promise<{ error: string } | { error?: undefined }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Not signed in" };

  const displayName = String(formData.get("display_name") ?? "").trim();
  if (!displayName) return { error: "Display name is required" };

  const fullName = String(formData.get("full_name") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const pronouns = String(formData.get("pronouns") ?? "").trim();
  const statusEmoji = String(formData.get("status_emoji") ?? "").trim();
  const statusText = String(formData.get("status_text") ?? "").trim();
  const avatarUrl = String(formData.get("avatar_url") ?? "").trim();

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      full_name: fullName || null,
      title: title || null,
      pronouns: pronouns || null,
      status_emoji: statusEmoji || null,
      status_text: statusText || null,
      avatar_url: avatarUrl || null,
    })
    .eq("id", userData.user.id);

  if (error) return { error: error.message };

  // Profiles are shown in every workspace's sidebar/member list/message
  // history, not just the current one — revalidate broadly.
  revalidatePath("/w", "layout");
  return {};
}

export async function completeOnboarding(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Not signed in" };

  const { error } = await supabase
    .from("profiles")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("id", userData.user.id);

  if (error) return { error: error.message };
  revalidatePath("/workspaces");
  return {};
}
