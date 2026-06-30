import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceSetupScreen } from "@/components/onboarding/workspace-setup-screen";

export default async function WorkspaceIndexPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const supabase = await createClient();

  const { data: firstChannel } = await supabase
    .from("channels")
    .select("id")
    .eq("workspace_id", workspaceId)
    .order("name")
    .limit(1)
    .maybeSingle();

  if (firstChannel) redirect(`/w/${workspaceId}/c/${firstChannel.id}`);

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("name, join_code")
    .eq("id", workspaceId)
    .single();

  if (!workspace) redirect("/workspaces");

  const { data: memberData } = await supabase
    .from("workspace_members")
    .select("profiles(id, display_name)")
    .eq("workspace_id", workspaceId);

  type MemberRow = { profiles: { id: string; display_name: string } | null };
  const members = ((memberData ?? []) as unknown as MemberRow[])
    .map((row) => row.profiles)
    .filter((p): p is { id: string; display_name: string } => !!p);

  return (
    <WorkspaceSetupScreen
      workspaceId={workspaceId}
      workspaceName={workspace.name}
      joinCode={workspace.join_code}
      members={members}
    />
  );
}
