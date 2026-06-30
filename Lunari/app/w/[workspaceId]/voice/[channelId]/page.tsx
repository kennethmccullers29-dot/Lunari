import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CallView } from "@/components/video/call-view";

export default async function VoiceChannelPage({
  params,
}: {
  params: Promise<{ workspaceId: string; channelId: string }>;
}) {
  const { workspaceId, channelId } = await params;
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const [channelRes, profileRes] = await Promise.all([
    supabase
      .from("channels")
      .select("id, name, type, workspace_id")
      .eq("id", channelId)
      .single(),
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", userData.user.id)
      .single(),
  ]);

  if (!channelRes.data || channelRes.data.type !== "voice") {
    redirect(`/w/${workspaceId}`);
  }

  return (
    <CallView
      channelId={channelRes.data.id}
      workspaceId={workspaceId}
      channelName={channelRes.data.name}
      currentUser={{
        userId: userData.user.id,
        displayName: profileRes.data?.display_name ?? "Guest",
        avatarUrl: profileRes.data?.avatar_url ?? null,
      }}
    />
  );
}
