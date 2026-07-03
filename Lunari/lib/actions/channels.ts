"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createChannel(formData: FormData) {
  const workspaceId = String(formData.get("workspace_id") ?? "");
  const name = String(formData.get("name") ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
  const isPrivate = formData.get("is_private") === "on";
  const memberIds = formData.getAll("member_ids").map(String);
  const rawType = String(formData.get("type") ?? "text");
  const type = (["text", "voice", "forum"] as const).includes(rawType as "text" | "voice" | "forum")
    ? (rawType as "text" | "voice" | "forum")
    : "text";

  if (!workspaceId || !name) {
    redirect(`/w/${workspaceId}?error=Channel name is required`);
  }

  const supabase = await createClient();
  const { data: channel, error } = await supabase.rpc("create_channel", {
    _workspace_id: workspaceId,
    _name: name,
    _is_private: isPrivate,
    _member_ids: memberIds,
    _type: type,
  });

  if (error || !channel) {
    redirect(
      `/w/${workspaceId}?error=${encodeURIComponent(error?.message ?? "Could not create channel")}`
    );
  }

  if (type === "voice") {
    redirect(`/w/${workspaceId}/voice/${channel.id}`);
  } else {
    redirect(`/w/${workspaceId}/c/${channel.id}`);
  }
  // forum channels also use /c/[channelId] — type is detected at that route
}
