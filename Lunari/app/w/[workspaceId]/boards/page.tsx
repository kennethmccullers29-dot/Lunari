import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BoardsClient } from "@/components/board/boards-client";

export default async function BoardsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: boards } = await supabase
    .from("boards")
    .select("id, name, description, is_private, created_by, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at");

  return (
    <BoardsClient
      workspaceId={workspaceId}
      boards={boards ?? []}
    />
  );
}
