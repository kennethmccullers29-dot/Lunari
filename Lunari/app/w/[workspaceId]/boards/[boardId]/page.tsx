import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BoardView } from "@/components/board/board-view";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ workspaceId: string; boardId: string }>;
}) {
  const { workspaceId, boardId } = await params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: board } = await supabase
    .from("boards")
    .select("id, name, description, is_private, created_by")
    .eq("id", boardId)
    .single();

  if (!board) redirect(`/w/${workspaceId}/boards`);

  const { data: columnsData } = await supabase
    .from("board_columns")
    .select("id, name, position")
    .eq("board_id", boardId)
    .order("position");

  const columns = columnsData ?? [];
  const columnIds = columns.map((c) => c.id);

  const { data: cardsData } = await supabase
    .from("board_cards")
    .select("id, column_id, title, description, position, due_date, created_by")
    .in("column_id", columnIds.length > 0 ? columnIds : ["00000000-0000-0000-0000-000000000000"])
    .order("position");

  const cards = cardsData ?? [];
  const cardIds = cards.map((c) => c.id);

  const { data: labelsData } = await supabase
    .from("card_labels")
    .select("id, card_id, color, text")
    .in("card_id", cardIds.length > 0 ? cardIds : ["00000000-0000-0000-0000-000000000000"]);

  const { data: assigneesData } = await supabase
    .from("card_assignees")
    .select("card_id, user_id, profiles(id, display_name, avatar_url)")
    .in("card_id", cardIds.length > 0 ? cardIds : ["00000000-0000-0000-0000-000000000000"]);

  const { data: memberData } = await supabase
    .from("workspace_members")
    .select("profiles(id, display_name, avatar_url)")
    .eq("workspace_id", workspaceId);

  type MemberProfile = { id: string; display_name: string; avatar_url: string | null };
  const members = ((memberData ?? []) as unknown as { profiles: MemberProfile | null }[])
    .map((r) => r.profiles)
    .filter((p): p is MemberProfile => !!p);

  type AssigneeRow = { card_id: string; user_id: string; profiles: MemberProfile | null };
  const assigneesByCard: Record<string, MemberProfile[]> = {};
  for (const row of (assigneesData ?? []) as unknown as AssigneeRow[]) {
    if (!assigneesByCard[row.card_id]) assigneesByCard[row.card_id] = [];
    if (row.profiles) assigneesByCard[row.card_id].push(row.profiles);
  }

  type LabelRow = { id: string; card_id: string; color: string; text: string };
  const labelsByCard: Record<string, LabelRow[]> = {};
  for (const label of (labelsData ?? []) as LabelRow[]) {
    if (!labelsByCard[label.card_id]) labelsByCard[label.card_id] = [];
    labelsByCard[label.card_id].push(label);
  }

  const enrichedCards = cards.map((c) => ({
    ...c,
    labels: labelsByCard[c.id] ?? [],
    assignees: assigneesByCard[c.id] ?? [],
  }));

  const enrichedColumns = columns.map((col) => ({
    ...col,
    cards: enrichedCards.filter((c) => c.column_id === col.id),
  }));

  return (
    <BoardView
      workspaceId={workspaceId}
      board={board}
      columns={enrichedColumns}
      members={members}
      currentUserId={userData.user.id}
    />
  );
}
