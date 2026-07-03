import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChannelHeader } from "@/components/channel/channel-header";
import { ChannelView } from "@/components/messages/channel-view";

export default async function DmPage({
  params,
}: {
  params: Promise<{ workspaceId: string; dmId: string }>;
}) {
  const { workspaceId, dmId } = await params;
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: conversationData } = await supabase
    .from("dm_conversations")
    .select("id, dm_participants(user_id, profiles(id, display_name))")
    .eq("id", dmId)
    .single();

  if (!conversationData) redirect(`/w/${workspaceId}`);

  type DmProfile = { id: string; display_name: string };
  const conversation = conversationData as unknown as {
    id: string;
    dm_participants: { profiles: DmProfile | null }[];
  };

  const others = conversation.dm_participants
    .map((p) => p.profiles)
    .filter((p): p is DmProfile => !!p && p.id !== userData.user!.id);

  const title = others.map((o) => o.display_name).join(", ") || "Conversation";

  const [{ data: memberData }, { data: myMembership }] = await Promise.all([
    supabase
      .from("workspace_members")
      .select("profiles(id, display_name, avatar_url)")
      .eq("workspace_id", workspaceId),
    supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userData.user.id)
      .single(),
  ]);

  type MemberProfile = { id: string; display_name: string; avatar_url: string | null };
  const memberRows = (memberData ?? []) as unknown as { profiles: MemberProfile | null }[];

  const membersById = Object.fromEntries(
    memberRows
      .map((r) => r.profiles)
      .filter((p): p is MemberProfile => !!p)
      .map((p) => [p.id, { name: p.display_name, avatarUrl: p.avatar_url }])
  );

  const isAdminOrOwner =
    myMembership?.role === "owner" || myMembership?.role === "admin";

  return (
    <ChannelView
      header={<ChannelHeader icon="@" title={title} />}
      target={{ dmConversationId: conversation.id }}
      membersById={membersById}
      currentUserId={userData.user.id}
      isAdminOrOwner={isAdminOrOwner}
      placeholder={`Message ${title}`}
      emptyIcon="👋"
      emptyTitle={`This is the beginning of your conversation with ${title}`}
    />
  );
}
