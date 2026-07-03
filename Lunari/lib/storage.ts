import { createClient } from "@/lib/supabase/client";

export async function uploadAttachment(
  file: File
): Promise<{ url: string; type: "image" | "gif" | "file"; name: string }> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not signed in");

  const path = `${userData.user.id}/${crypto.randomUUID()}-${file.name}`;
  const { error } = await supabase.storage.from("attachments").upload(path, file);
  if (error) throw error;

  const { data } = supabase.storage.from("attachments").getPublicUrl(path);

  let type: "image" | "gif" | "file" = "file";
  if (file.type === "image/gif") type = "gif";
  else if (file.type.startsWith("image/")) type = "image";

  return { url: data.publicUrl, type, name: file.name };
}

export async function uploadVoice(blob: Blob): Promise<{ url: string; name: string }> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not signed in");

  const name = `voice-${Date.now()}.webm`;
  const path = `${userData.user.id}/${name}`;
  const { error } = await supabase.storage
    .from("attachments")
    .upload(path, blob, { contentType: "audio/webm" });
  if (error) throw error;

  const { data } = supabase.storage.from("attachments").getPublicUrl(path);
  return { url: data.publicUrl, name };
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
