"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// ── Board CRUD ───────────────────────────────────────────────

export async function createBoard(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const workspaceId = String(formData.get("workspace_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const isPrivate = formData.get("is_private") === "true";

  if (!name) return { error: "Board name is required" };

  const { data: boardId, error } = await supabase.rpc("create_board", {
    _workspace_id: workspaceId,
    _name: name,
    _description: description,
    _is_private: isPrivate,
  });

  if (error || !boardId) return { error: error?.message ?? "Could not create board" };

  revalidatePath(`/w/${workspaceId}`, "layout");
  redirect(`/w/${workspaceId}/boards/${boardId}`);
}

export async function updateBoardName(boardId: string, name: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("boards").update({ name }).eq("id", boardId);
  if (error) return { error: error.message };
  return {};
}

// ── Column CRUD ──────────────────────────────────────────────

export async function createColumn(boardId: string, name: string): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();

  const { data: cols } = await supabase
    .from("board_columns")
    .select("position")
    .eq("board_id", boardId)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition = (cols?.[0]?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from("board_columns")
    .insert({ board_id: boardId, name, position: nextPosition })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Could not create column" };
  return { id: data.id };
}

export async function updateColumnName(columnId: string, name: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("board_columns").update({ name }).eq("id", columnId);
  if (error) return { error: error.message };
  return {};
}

export async function deleteColumn(columnId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("board_columns").delete().eq("id", columnId);
  if (error) return { error: error.message };
  return {};
}

export async function reorderColumns(updates: { id: string; position: number }[]): Promise<{ error?: string }> {
  const supabase = await createClient();
  for (const { id, position } of updates) {
    await supabase.from("board_columns").update({ position }).eq("id", id);
  }
  return {};
}

// ── Card CRUD ────────────────────────────────────────────────

export async function createCard(
  columnId: string,
  title: string
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Not signed in" };

  const { data: cards } = await supabase
    .from("board_cards")
    .select("position")
    .eq("column_id", columnId)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition = (cards?.[0]?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from("board_cards")
    .insert({ column_id: columnId, title, position: nextPosition, created_by: userData.user.id })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Could not create card" };
  return { id: data.id };
}

export async function updateCard(
  cardId: string,
  updates: { title?: string; description?: string | null; due_date?: string | null }
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("board_cards").update(updates).eq("id", cardId);
  if (error) return { error: error.message };
  return {};
}

export async function deleteCard(cardId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("board_cards").delete().eq("id", cardId);
  if (error) return { error: error.message };
  return {};
}

export async function moveCard(
  cardId: string,
  newColumnId: string,
  newPosition: number
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("board_cards")
    .update({ column_id: newColumnId, position: newPosition })
    .eq("id", cardId);
  if (error) return { error: error.message };
  return {};
}

export async function reorderCards(updates: { id: string; column_id: string; position: number }[]): Promise<{ error?: string }> {
  const supabase = await createClient();
  for (const { id, column_id, position } of updates) {
    await supabase.from("board_cards").update({ column_id, position }).eq("id", id);
  }
  return {};
}

// ── Labels ───────────────────────────────────────────────────

export async function setCardLabels(
  cardId: string,
  labels: { color: string; text: string }[]
): Promise<{ error?: string }> {
  const supabase = await createClient();
  await supabase.from("card_labels").delete().eq("card_id", cardId);
  if (labels.length > 0) {
    const { error } = await supabase
      .from("card_labels")
      .insert(labels.map((l) => ({ card_id: cardId, color: l.color, text: l.text })));
    if (error) return { error: error.message };
  }
  return {};
}

// ── Assignees ────────────────────────────────────────────────

export async function setCardAssignees(
  cardId: string,
  userIds: string[]
): Promise<{ error?: string }> {
  const supabase = await createClient();
  await supabase.from("card_assignees").delete().eq("card_id", cardId);
  if (userIds.length > 0) {
    const { error } = await supabase
      .from("card_assignees")
      .insert(userIds.map((uid) => ({ card_id: cardId, user_id: uid })));
    if (error) return { error: error.message };
  }
  return {};
}

// ── Checklist ────────────────────────────────────────────────

export async function addChecklistItem(
  cardId: string,
  text: string
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();

  const { data: items } = await supabase
    .from("card_checklist_items")
    .select("position")
    .eq("card_id", cardId)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition = (items?.[0]?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from("card_checklist_items")
    .insert({ card_id: cardId, text, position: nextPosition })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Could not add item" };
  return { id: data.id };
}

export async function toggleChecklistItem(itemId: string, isDone: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("card_checklist_items")
    .update({ is_done: isDone })
    .eq("id", itemId);
  if (error) return { error: error.message };
  return {};
}

export async function deleteChecklistItem(itemId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("card_checklist_items").delete().eq("id", itemId);
  if (error) return { error: error.message };
  return {};
}
