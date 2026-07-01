"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Plus, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/optics/button";
import { BoardColumn } from "@/components/board/board-column";
import { CardTile } from "@/components/board/card-tile";
import { CardDetailModal } from "@/components/board/card-detail-modal";
import { createColumn, reorderCards } from "@/lib/actions/boards";

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
type Column = {
  id: string;
  name: string;
  position: number;
  cards: Card[];
};
type Board = {
  id: string;
  name: string;
  description: string | null;
  is_private: boolean;
  created_by: string;
};

export function BoardView({
  workspaceId,
  board,
  columns: initialColumns,
  members,
  currentUserId,
}: {
  workspaceId: string;
  board: Board;
  columns: Column[];
  members: Member[];
  currentUserId: string;
}) {
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [activeCardColumnId, setActiveCardColumnId] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<{ card: Card; columnName: string } | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === "card") {
      setActiveCard(active.data.current.card as Card);
      setActiveCardColumnId(active.data.current.columnId as string);
    }
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.data.current?.type !== "card") return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const activeColId = active.data.current?.columnId as string;
    const overColId = (over.data.current?.columnId ?? over.id) as string;

    if (activeColId === overColId) return;

    setColumns((prev) => {
      const activeCol = prev.find((c) => c.id === activeColId);
      const overCol = prev.find((c) => c.id === overColId);
      if (!activeCol || !overCol) return prev;

      const activeCardItem = activeCol.cards.find((c) => c.id === activeId);
      if (!activeCardItem) return prev;

      const overIndex = over.data.current?.type === "card"
        ? overCol.cards.findIndex((c) => c.id === overId)
        : overCol.cards.length;

      return prev.map((col) => {
        if (col.id === activeColId) {
          return { ...col, cards: col.cards.filter((c) => c.id !== activeId) };
        }
        if (col.id === overColId) {
          const newCards = [...col.cards];
          newCards.splice(overIndex < 0 ? newCards.length : overIndex, 0, {
            ...activeCardItem,
            column_id: overColId,
          });
          return { ...col, cards: newCards };
        }
        return col;
      });
    });
    setActiveCardColumnId(overColId);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);
    setActiveCardColumnId(null);
    if (!over || active.data.current?.type !== "card") return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const overColId = (over.data.current?.columnId ?? over.id) as string;

    setColumns((prev) => {
      const col = prev.find((c) => c.id === overColId);
      if (!col) return prev;
      const oldIndex = col.cards.findIndex((c) => c.id === activeId);
      const newIndex = col.cards.findIndex((c) => c.id === overId);
      if (oldIndex === -1 || oldIndex === newIndex) return prev;

      const reordered = arrayMove(col.cards, oldIndex, newIndex);
      const updates = reordered.map((c, i) => ({ id: c.id, column_id: overColId, position: i }));
      reorderCards(updates);
      return prev.map((c) => (c.id === overColId ? { ...c, cards: reordered } : c));
    });
  }, []);

  const handleAddColumn = async () => {
    if (!newColumnName.trim()) return;
    const result = await createColumn(board.id, newColumnName.trim());
    if ("id" in result) {
      setColumns((prev) => [
        ...prev,
        { id: result.id, name: newColumnName.trim(), position: prev.length, cards: [] },
      ]);
      setNewColumnName("");
      setAddingColumn(false);
    }
  };

  const handleCardUpdated = useCallback((cardId: string, updates: Partial<Card>) => {
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        cards: col.cards.map((c) => (c.id === cardId ? { ...c, ...updates } : c)),
      }))
    );
    if (selectedCard?.card.id === cardId) {
      setSelectedCard((prev) => prev ? { ...prev, card: { ...prev.card, ...updates } } : null);
    }
  }, [selectedCard]);

  const handleCardDeleted = useCallback((cardId: string) => {
    setColumns((prev) =>
      prev.map((col) => ({ ...col, cards: col.cards.filter((c) => c.id !== cardId) }))
    );
    setSelectedCard(null);
  }, []);

  const handleCardCreated = useCallback((columnId: string, card: Card) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.id === columnId ? { ...col, cards: [...col.cards, card] } : col
      )
    );
  }, []);

  const handleColumnDeleted = useCallback((columnId: string) => {
    setColumns((prev) => prev.filter((c) => c.id !== columnId));
  }, []);

  const handleColumnRenamed = useCallback((columnId: string, name: string) => {
    setColumns((prev) => prev.map((c) => (c.id === columnId ? { ...c, name } : c)));
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Link
          href={`/w/${workspaceId}/boards`}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Boards
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-sm font-semibold">{board.name}</h1>
      </div>

      {/* Board canvas */}
      <div className="min-h-0 flex-1 overflow-x-auto p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex h-full gap-3">
            {columns.map((col) => (
              <BoardColumn
                key={col.id}
                column={col}
                members={members}
                currentUserId={currentUserId}
                onCardClick={(card) => setSelectedCard({ card, columnName: col.name })}
                onCardCreated={(card) => handleCardCreated(col.id, card)}
                onColumnDeleted={handleColumnDeleted}
                onColumnRenamed={handleColumnRenamed}
              />
            ))}

            {/* Add column */}
            <div className="w-64 shrink-0">
              {addingColumn ? (
                <div className="rounded-xl border bg-muted/40 p-2 space-y-2">
                  <input
                    autoFocus
                    className="w-full rounded-lg border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                    placeholder="Column name"
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddColumn();
                      if (e.key === "Escape") { setAddingColumn(false); setNewColumnName(""); }
                    }}
                  />
                  <div className="flex gap-1">
                    <Button size="sm" onClick={handleAddColumn}>Add</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setAddingColumn(false); setNewColumnName(""); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingColumn(true)}
                  className="flex w-full items-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/30 px-3 py-2 text-sm text-muted-foreground hover:border-muted-foreground/60 hover:text-foreground transition-colors"
                >
                  <Plus className="size-4" />
                  Add column
                </button>
              )}
            </div>
          </div>

          <DragOverlay>
            {activeCard && (
              <CardTile
                card={activeCard}
                members={members}
                isDragging
                onClick={() => {}}
              />
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {selectedCard && (
        <CardDetailModal
          card={selectedCard.card}
          columnName={selectedCard.columnName}
          members={members}
          currentUserId={currentUserId}
          onClose={() => setSelectedCard(null)}
          onUpdated={handleCardUpdated}
          onDeleted={handleCardDeleted}
        />
      )}
    </div>
  );
}
