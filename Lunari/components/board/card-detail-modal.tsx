"use client";

import { useState } from "react";
import { X, Trash2, CalendarDays, Tag, Users, CheckSquare, AlignLeft } from "lucide-react";
import { Button } from "@/components/optics/button";
import { Input } from "@/components/optics/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/optics/avatar";
import {
  updateCard,
  deleteCard,
  setCardLabels,
  setCardAssignees,
  addChecklistItem,
  toggleChecklistItem,
  deleteChecklistItem,
} from "@/lib/actions/boards";

type Label = { id: string; color: string; text: string };
type Member = { id: string; display_name: string; avatar_url: string | null };
type ChecklistItem = { id: string; text: string; is_done: boolean; position: number };
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

const LABEL_COLORS = ["red", "green", "blue", "yellow", "purple", "orange", "sky", "pink", "teal"] as const;
const LABEL_COLOR_MAP: Record<string, string> = {
  red: "bg-red-500", green: "bg-emerald-500", blue: "bg-blue-500",
  yellow: "bg-amber-400", purple: "bg-purple-500", orange: "bg-orange-500",
  sky: "bg-sky-400", pink: "bg-pink-500", teal: "bg-teal-500",
};

export function CardDetailModal({
  card: initialCard,
  columnName,
  members,
  currentUserId: _currentUserId,
  onClose,
  onUpdated,
  onDeleted,
}: {
  card: Card;
  columnName: string;
  members: Member[];
  currentUserId: string;
  onClose: () => void;
  onUpdated: (cardId: string, updates: Partial<Card>) => void;
  onDeleted: (cardId: string) => void;
}) {
  const [card, setCard] = useState(initialCard);
  const [title, setTitle] = useState(initialCard.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [description, setDescription] = useState(initialCard.description ?? "");
  const [editingDesc, setEditingDesc] = useState(false);
  const [dueDate, setDueDate] = useState(
    initialCard.due_date ? initialCard.due_date.slice(0, 16) : ""
  );
  const [labels, setLabels] = useState<Label[]>(initialCard.labels);
  const [assignees, setAssignees] = useState<Member[]>(initialCard.assignees);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [checklistLoaded, setChecklistLoaded] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [addingItem, setAddingItem] = useState(false);

  // Load checklist on first open of that section
  const loadChecklist = async () => {
    if (checklistLoaded) return;
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const { data } = await supabase
      .from("card_checklist_items")
      .select("id, text, is_done, position")
      .eq("card_id", card.id)
      .order("position");
    setChecklist(data ?? []);
    setChecklistLoaded(true);
  };

  const handleTitleSave = async () => {
    if (!title.trim() || title === card.title) { setEditingTitle(false); return; }
    await updateCard(card.id, { title: title.trim() });
    onUpdated(card.id, { title: title.trim() });
    setCard((c) => ({ ...c, title: title.trim() }));
    setEditingTitle(false);
  };

  const handleDescSave = async () => {
    await updateCard(card.id, { description: description.trim() || null });
    onUpdated(card.id, { description: description.trim() || null });
    setCard((c) => ({ ...c, description: description.trim() || null }));
    setEditingDesc(false);
  };

  const handleDueDateChange = async (value: string) => {
    setDueDate(value);
    const due = value ? new Date(value).toISOString() : null;
    await updateCard(card.id, { due_date: due });
    onUpdated(card.id, { due_date: due });
    setCard((c) => ({ ...c, due_date: due }));
  };

  const handleToggleLabel = async (color: string) => {
    const exists = labels.find((l) => l.color === color);
    const newLabels = exists
      ? labels.filter((l) => l.color !== color)
      : [...labels, { id: Date.now().toString(), color, text: "" }];
    setLabels(newLabels);
    await setCardLabels(card.id, newLabels.map((l) => ({ color: l.color, text: l.text })));
    onUpdated(card.id, { labels: newLabels });
  };

  const handleToggleAssignee = async (member: Member) => {
    const assigned = assignees.find((a) => a.id === member.id);
    const newAssignees = assigned
      ? assignees.filter((a) => a.id !== member.id)
      : [...assignees, member];
    setAssignees(newAssignees);
    await setCardAssignees(card.id, newAssignees.map((a) => a.id));
    onUpdated(card.id, { assignees: newAssignees });
  };

  const handleAddItem = async () => {
    if (!newItem.trim()) return;
    const result = await addChecklistItem(card.id, newItem.trim());
    if ("id" in result) {
      setChecklist((prev) => [...prev, { id: result.id, text: newItem.trim(), is_done: false, position: prev.length }]);
      setNewItem("");
    }
  };

  const handleToggleItem = async (itemId: string, isDone: boolean) => {
    setChecklist((prev) => prev.map((i) => (i.id === itemId ? { ...i, is_done: isDone } : i)));
    await toggleChecklistItem(itemId, isDone);
  };

  const handleDeleteItem = async (itemId: string) => {
    setChecklist((prev) => prev.filter((i) => i.id !== itemId));
    await deleteChecklistItem(itemId);
  };

  const handleDeleteCard = async () => {
    if (!confirm("Delete this card?")) return;
    await deleteCard(card.id);
    onDeleted(card.id);
  };

  const doneCount = checklist.filter((i) => i.is_done).length;
  const totalCount = checklist.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4 pt-16">
      <div className="relative w-full max-w-2xl rounded-2xl bg-background shadow-2xl ring-1 ring-foreground/10">
        {/* Header */}
        <div className="flex items-start gap-3 border-b p-5">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-1">in <span className="font-medium">{columnName}</span></p>
            {editingTitle ? (
              <input
                autoFocus
                className="w-full text-lg font-semibold outline-none border-b-2 border-primary pb-0.5 bg-transparent"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => { if (e.key === "Enter") handleTitleSave(); if (e.key === "Escape") { setTitle(card.title); setEditingTitle(false); } }}
              />
            ) : (
              <h2
                className="text-lg font-semibold cursor-pointer hover:text-primary"
                onClick={() => setEditingTitle(true)}
              >
                {card.title}
              </h2>
            )}
          </div>
          <button onClick={onClose} className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        <div className="flex gap-6 p-5">
          {/* Main content */}
          <div className="flex-1 space-y-5 min-w-0">
            {/* Labels display */}
            {labels.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {labels.map((l) => (
                  <span key={l.id} className={`rounded-full px-2.5 py-1 text-xs font-medium text-white ${LABEL_COLOR_MAP[l.color] ?? "bg-neutral-400"}`}>
                    {l.text || l.color}
                  </span>
                ))}
              </div>
            )}

            {/* Description */}
            <div>
              <div className="flex items-center gap-1.5 mb-2 text-sm font-medium">
                <AlignLeft className="size-4 text-muted-foreground" />
                Description
              </div>
              {editingDesc ? (
                <div className="space-y-2">
                  <textarea
                    autoFocus
                    className="w-full resize-none rounded-lg border bg-muted/30 p-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40 min-h-24"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add a description…"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleDescSave}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setDescription(card.description ?? ""); setEditingDesc(false); }}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setEditingDesc(true)}
                  className="min-h-12 cursor-pointer rounded-lg bg-muted/30 p-2.5 text-sm text-muted-foreground hover:bg-muted/50"
                >
                  {description || "Add a description…"}
                </div>
              )}
            </div>

            {/* Checklist */}
            <div>
              <button
                className="flex items-center gap-1.5 mb-3 text-sm font-medium w-full"
                onClick={() => { loadChecklist(); setAddingItem(true); }}
              >
                <CheckSquare className="size-4 text-muted-foreground" />
                Checklist
                {totalCount > 0 && (
                  <span className="ml-1 text-xs text-muted-foreground">({doneCount}/{totalCount})</span>
                )}
              </button>

              {checklistLoaded && (
                <>
                  {totalCount > 0 && (
                    <div className="mb-2 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.round((doneCount / totalCount) * 100)}%` }}
                      />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    {checklist.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 group">
                        <input
                          type="checkbox"
                          checked={item.is_done}
                          onChange={(e) => handleToggleItem(item.id, e.target.checked)}
                          className="size-3.5 cursor-pointer accent-primary"
                        />
                        <span className={`flex-1 text-sm ${item.is_done ? "line-through text-muted-foreground" : ""}`}>
                          {item.text}
                        </span>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {addingItem ? (
                    <div className="mt-2 space-y-1.5">
                      <Input
                        autoFocus
                        value={newItem}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewItem(e.target.value)}
                        placeholder="Add an item"
                        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                          if (e.key === "Enter") handleAddItem();
                          if (e.key === "Escape") { setAddingItem(false); setNewItem(""); }
                        }}
                      />
                      <div className="flex gap-1">
                        <Button size="sm" onClick={handleAddItem}>Add</Button>
                        <Button size="sm" variant="ghost" onClick={() => { setAddingItem(false); setNewItem(""); }}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingItem(true)}
                      className="mt-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      + Add item
                    </button>
                  )}
                </>
              )}

              {!checklistLoaded && (
                <button
                  onClick={loadChecklist}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Load checklist
                </button>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-44 shrink-0 space-y-4">
            {/* Due date */}
            <div>
              <div className="flex items-center gap-1.5 mb-1.5 text-xs font-medium text-muted-foreground">
                <CalendarDays className="size-3.5" /> Due date
              </div>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => handleDueDateChange(e.target.value)}
                className="w-full rounded-lg border bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring/40"
              />
              {dueDate && (
                <button
                  onClick={() => handleDueDateChange("")}
                  className="mt-1 text-xs text-muted-foreground hover:text-destructive"
                >
                  Remove
                </button>
              )}
            </div>

            {/* Labels */}
            <div>
              <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-muted-foreground">
                <Tag className="size-3.5" /> Labels
              </div>
              <div className="flex flex-wrap gap-1.5">
                {LABEL_COLORS.map((color) => {
                  const active = labels.some((l) => l.color === color);
                  return (
                    <button
                      key={color}
                      onClick={() => handleToggleLabel(color)}
                      title={color}
                      className={`size-6 rounded-full transition-all ${LABEL_COLOR_MAP[color]} ${active ? "ring-2 ring-offset-1 ring-foreground scale-110" : "opacity-50 hover:opacity-80"}`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Assignees */}
            <div>
              <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-muted-foreground">
                <Users className="size-3.5" /> Assignees
              </div>
              <div className="space-y-1">
                {members.map((m) => {
                  const assigned = assignees.some((a) => a.id === m.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => handleToggleAssignee(m)}
                      className={`flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-xs transition-colors ${assigned ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
                    >
                      <Avatar size="sm" className="size-5">
                        {m.avatar_url && <AvatarImage src={m.avatar_url} width={20} height={20} alt="" />}
                        <AvatarFallback className="bg-black text-white text-[8px] font-bold uppercase">
                          {m.display_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">{m.display_name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Delete */}
            <button
              onClick={handleDeleteCard}
              className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="size-3.5" /> Delete card
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
