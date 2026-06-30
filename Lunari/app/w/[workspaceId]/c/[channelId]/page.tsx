import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChannelHeader } from "@/components/channel/channel-header";
import { MessageView } from "@/components/messages/message-view";

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ workspaceId: string; channelId: string }>;
}) {
  const { workspaceId, channelId } = await params;
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: channel } = await supabase
    .from("channels")
    .select("id, name, is_private")
    .eq("id", channelId)
    .single();

  if (!channel) redirect(`/w/${workspaceId}`);

  const { data: memberData } = await supabase
    .from("workspace_members")
    .select("profiles(id, display_name, avatar_url)")
    .eq("workspace_id", workspaceId);

  type MemberProfile = { id: string; display_name: string; avatar_url: string | null };
  const memberRows = (memberData ?? []) as unknown as { profiles: MemberProfile | null }[];

  const membersById = Object.fromEntries(
    memberRows
      .map((r) => r.profiles)
      .filter((p): p is MemberProfile => !!p)
      .map((p) => [p.id, { name: p.display_name, avatarUrl: p.avatar_url }])
  );

  return (
    <>
      <ChannelHeader icon={channel.is_private ? "🔒" : "#"} title={channel.name} />
      <MessageView
        target={{ channelId: channel.id }}
        membersById={membersById}
        currentUserId={userData.user.id}
        placeholder={`Message #${channel.name}`}
        emptyIcon={channel.is_private ? "🔒" : "#"}
        emptyTitle={`This is the beginning of #${channel.name}`}
      />
    </>
  );
}
