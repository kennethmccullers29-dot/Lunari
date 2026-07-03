import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AiChatClient } from "@/components/ai/ai-chat-client";

export default async function AiPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("name")
    .eq("id", workspaceId)
    .single();

  if (!workspace) redirect("/workspaces");

  // Fetch existing conversations for this user/workspace
  const { data: conversationsData } = await supabase
    .from("ai_conversations")
    .select("id, title, created_at")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  // Workspace context for AI
  const { data: channelsData } = await supabase
    .from("channels")
    .select("name, type")
    .eq("workspace_id", workspaceId)
    .order("name");

  const { data: membersData } = await supabase
    .from("workspace_members")
    .select("profiles(display_name)")
    .eq("workspace_id", workspaceId);

  const { data: profileData } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .eq("id", user.id)
    .single();

  type ChannelRow = { name: string; type: string };
  type MemberRow = { profiles: { display_name: string } | null };

  const channelNames = ((channelsData ?? []) as ChannelRow[]).map((c) => c.name);
  const memberNames = ((membersData ?? []) as unknown as MemberRow[])
    .map((m) => m.profiles?.display_name)
    .filter((n): n is string => !!n);

  const currentUser = profileData ?? {
    id: user.id,
    display_name: user.email ?? "Me",
    avatar_url: null,
  };

  type Conversation = { id: string; title: string; created_at: string };

  return (
    <AiChatClient
      workspaceId={workspaceId}
      workspaceName={workspace.name}
      channelNames={channelNames}
      memberNames={memberNames}
      initialConversations={(conversationsData as Conversation[]) ?? []}
      currentUser={currentUser}
    />
  );
}
