"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { MoreHorizontal, Plus, Trash2, Pencil } from "lucide-react";
import { CardTile } from "@/components/board/card-tile";
import { Button } from "@/components/optics/button";
import { createCard, deleteColumn, updateColumnName } from "@/lib/actions/boards";

type Label = { id: string; color: string; text: string };
type Member = { id: string; display_name: string; avatar_url: string | null };
type Card = {
  id: string;
  column_id: string;
  title: string;
  description: string | null;
  position: number;
  due_date: string | null;
  labels: Label[];
  assignees: Member[];
};
type Column = { id: string; name: string; position: number; cards: Card[] };

export function BoardColumn({
  column,
  members,
  currentUserId,
  onCardClick,
  onCardCreated,
  onColumnDeleted,
  onColumnRenamed,
}: {
  column: Column;
  members: Member[];
  currentUserId: string;
  onCardClick: (card: Card) => void;
  onCardCreated: (card: Card) => void;
  onColumnDeleted: (id: string) => void;
  onColumnRenamed: (id: string, name: string) => void;
}) {
  const [addingCard, setAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(column.name);

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: "column", columnId: column.id },
  });

  const handleAddCard = async () => {
    if (!newCardTitle.trim()) return;
    const result = await createCard(column.id, newCardTitle.trim());
    if ("id" in result) {
      onCardCreated({
        id: result.id,
        column_id: column.id,
        title: newCardTitle.trim(),
        description: null,
        position: column.cards.length,
        due_date: null,
        labels: [],
        assignees: [],
      });
      setNewCardTitle("");
      setAddingCard(false);
    }
  };

  const handleRename = async () => {
    if (draftName.trim() && draftName !== column.name) {
      await updateColumnName(column.id, draftName.trim());
      onColumnRenamed(column.id, draftName.trim());
    }
    setEditingName(false);
  };

  const handleDelete = async () => {
    await deleteColumn(column.id);
    onColumnDeleted(column.id);
  };

  return (
    <div className="flex w-64 shrink-0 flex-col rounded-xl border bg-muted/40">
      {/* Column header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        {editingName ? (
          <input
            autoFocus
            className="flex-1 rounded-md bg-background px-1.5 py-0.5 text-sm font-medium outline-none ring-1 ring-ring/40"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") { setDraftName(column.name); setEditingName(false); }
            }}
          />
        ) : (
          <button
            className="flex-1 text-left text-sm font-medium truncate hover:text-primary"
            onDoubleClick={() => setEditingName(true)}
          >
            {column.name}
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              {column.cards.length}
            </span>
          </button>
        )}

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((p) => !p)}
            className="rounded-md p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <MoreHorizontal className="size-4" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-6 z-20 min-w-32 rounded-lg border bg-background shadow-lg py-1">
                <button
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted"
                  onClick={() => { setEditingName(true); setMenuOpen(false); }}
                >
                  <Pencil className="size-3.5" /> Rename
                </button>
                <button
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-destructive hover:bg-muted"
                  onClick={() => { handleDelete(); setMenuOpen(false); }}
                >
                  <Trash2 className="size-3.5" /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Cards */}
      <SortableContext
        items={column.cards.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className={`flex min-h-8 flex-1 flex-col gap-2 px-2 py-1 transition-colors ${isOver ? "bg-primary/5 rounded-lg" : ""}`}
        >
          {column.cards.map((card) => (
            <CardTile
              key={card.id}
              card={card}
              members={members}
              onClick={() => onCardClick(card)}
            />
          ))}
        </div>
      </SortableContext>

      {/* Add card */}
      <div className="px-2 pb-2 pt-1">
        {addingCard ? (
          <div className="space-y-1.5">
            <textarea
              autoFocus
              className="w-full resize-none rounded-lg border bg-background px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              rows={2}
              placeholder="Card title…"
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddCard(); }
                if (e.key === "Escape") { setAddingCard(false); setNewCardTitle(""); }
              }}
            />
            <div className="flex gap-1">
              <Button size="sm" onClick={handleAddCard}>Add</Button>
              <Button size="sm" variant="ghost" onClick={() => { setAddingCard(false); setNewCardTitle(""); }}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingCard(true)}
            className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Plus className="size-3.5" />
            Add card
          </button>
        )}
      </div>
    </div>
  );
}
