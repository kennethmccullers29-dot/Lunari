import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";
import { WorkspaceSwitcher } from "@/components/workspace/workspace-switcher";
import { WorkspaceActivityProvider } from "@/components/workspace/workspace-activity-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";


export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, name, join_code")
    .eq("id", workspaceId)
    .single();

  if (!workspace) redirect("/workspaces");

  const { data: channels } = await supabase
    .from("channels")
    .select("id, name, is_private, type")
    .eq("workspace_id", workspaceId)
    .order("name");

  const { data: memberData } = await supabase
    .from("workspace_members")
    .select(
      "user_id, profiles(id, display_name, status, avatar_url, full_name, title, pronouns, status_emoji, status_text)"
    )
    .eq("workspace_id", workspaceId);

  type MemberProfile = {
    id: string;
    display_name: string;
    status: "active" | "away" | "offline";
    avatar_url: string | null;
    full_name: string | null;
    title: string | null;
    pronouns: string | null;
    status_emoji: string | null;
    status_text: string | null;
  };
  const memberRows = (memberData ?? []) as unknown as { profiles: MemberProfile | null }[];

  const members = memberRows
    .map((row) => row.profiles)
    .filter((p): p is MemberProfile => !!p)
    .sort((a, b) => a.display_name.localeCompare(b.display_name));

  const currentUser = members.find((m) => m.id === userData.user!.id);
  if (!currentUser) redirect("/workspaces");

  const { data: dmData } = await supabase
    .from("dm_conversations")
    .select("id, is_group, dm_participants(user_id, profiles(id, display_name))")
    .eq("workspace_id", workspaceId);

  type DmProfile = { id: string; display_name: string };
  const dmRows = (dmData ?? []) as unknown as {
    id: string;
    is_group: boolean;
    dm_participants: { profiles: DmProfile | null }[];
  }[];

  const dms = dmRows.map((dm) => {
    const others = dm.dm_participants
      .map((p) => p.profiles)
      .filter((p): p is DmProfile => !!p && p.id !== userData.user!.id);
    return {
      id: dm.id,
      label: others.map((o) => o.display_name).join(", ") || "(empty conversation)",
    };
  });

  const { data: workspaceListData } = await supabase
    .from("workspace_members")
    .select("joined_at, workspaces(id, name)")
    .eq("user_id", userData.user.id)
    .order("joined_at");

  type WorkspaceItem = { id: string; name: string };
  const workspaceListRows = (workspaceListData ?? []) as unknown as {
    workspaces: WorkspaceItem | null;
  }[];
  const workspaceList = workspaceListRows
    .map((row) => row.workspaces)
    .filter((w): w is WorkspaceItem => !!w);

  const membersById = Object.fromEntries(members.map((m) => [m.id, m.display_name]));

  const { data: sentMessage } = await supabase
    .from("messages")
    .select("id")
    .eq("sender_id", userData.user.id)
    .limit(1)
    .maybeSingle();

  const { data: myMembership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userData.user.id)
    .single();

  const currentUserRole = (myMembership?.role ?? "member") as "owner" | "admin" | "member";

  return (
    <SidebarProvider className="h-svh">
      <WorkspaceActivityProvider
        workspaceId={workspace.id}
        currentUserId={userData.user.id}
        channels={(channels ?? []).filter((c) => c.type !== "voice").map((c) => ({ id: c.id, label: c.name }))}
        dms={dms}
        membersById={membersById}
      >
        <WorkspaceSwitcher workspaces={workspaceList} currentWorkspaceId={workspace.id} />
        <WorkspaceSidebar
          workspaceId={workspace.id}
          workspaceName={workspace.name}
          joinCode={workspace.join_code}
          channels={channels ?? []}
          dms={dms}
          members={members}
          currentUser={currentUser}
          currentUserEmail={userData.user.email ?? ""}
          hasSentMessage={!!sentMessage}
          currentUserRole={currentUserRole}
        />
        <SidebarInset>
          <main className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</main>
        </SidebarInset>
      </WorkspaceActivityProvider>
    </SidebarProvider>
  );
}
