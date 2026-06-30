import { createClient } from "@/lib/supabase/client";

export async function uploadAttachment(
  file: File
): Promise<{ url: string; type: "image" | "gif" }> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not signed in");

  const path = `${userData.user.id}/${crypto.randomUUID()}-${file.name}`;

  const { error } = await supabase.storage.from("attachments").upload(path, file);
  if (error) throw error;

  const { data } = supabase.storage.from("attachments").getPublicUrl(path);

  return {
    url: data.publicUrl,
    type: file.type === "image/gif" ? "gif" : "image",
  };
}

export async function uploadAvatar(file: File): Promise<string> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not signed in");

  const path = `${userData.user.id}/${crypto.randomUUID()}-${file.name}`;

  const { error } = await supabase.storage.from("avatars").upload(path, file);
  if (error) throw error;

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);

  return data.publicUrl;
}
