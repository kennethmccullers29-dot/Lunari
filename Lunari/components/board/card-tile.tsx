"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/optics/avatar";

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

const LABEL_COLORS: Record<string, string> = {
  red: "bg-red-500",
  green: "bg-emerald-500",
  blue: "bg-blue-500",
  yellow: "bg-amber-400",
  purple: "bg-purple-500",
  orange: "bg-orange-500",
  sky: "bg-sky-400",
  pink: "bg-pink-500",
  teal: "bg-teal-500",
};

export function CardTile({
  card,
  members: _members,
  onClick,
  isDragging,
}: {
  card: Card;
  members: Member[];
  onClick: () => void;
  isDragging?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableDragging,
  } = useSortable({
    id: card.id,
    data: { type: "card", card, columnId: card.column_id },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isOverlay = isDragging;
  const isPulled = sortableDragging && !isOverlay;

  const isOverdue = card.due_date && new Date(card.due_date) < new Date() && !isDragging;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`cursor-pointer rounded-lg border bg-background p-2.5 shadow-sm transition-shadow hover:shadow-md select-none ${
        isPulled ? "opacity-30 border-dashed" : ""
      } ${isOverlay ? "shadow-xl rotate-1 opacity-95" : ""}`}
    >
      {/* Labels */}
      {card.labels.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {card.labels.map((l) => (
            <span
              key={l.id}
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium text-white ${LABEL_COLORS[l.color] ?? "bg-neutral-400"}`}
            >
              {l.text || l.color}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <p className="text-xs font-medium leading-snug text-foreground">{card.title}</p>

      {/* Footer */}
      {(card.due_date || card.assignees.length > 0) && (
        <div className="mt-2 flex items-center justify-between gap-2">
          {card.due_date ? (
            <span className={`flex items-center gap-1 text-[10px] ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
              <CalendarDays className="size-3" />
              {new Date(card.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          ) : <span />}

          {card.assignees.length > 0 && (
            <div className="flex -space-x-1.5">
              {card.assignees.slice(0, 3).map((a) => (
                <Avatar key={a.id} size="sm" className="size-5 ring-1 ring-background">
                  {a.avatar_url && <AvatarImage src={a.avatar_url} width={20} height={20} alt="" />}
                  <AvatarFallback className="bg-black text-white text-[8px] font-bold uppercase">
                    {a.display_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {card.assignees.length > 3 && (
                <span className="flex size-5 items-center justify-center rounded-full bg-muted text-[8px] font-bold ring-1 ring-background">
                  +{card.assignees.length - 3}
                </span>
              )}
            </div>
          )}

          {card.description && !card.assignees.length && (
            <User className="size-3 text-muted-foreground" />
          )}
        </div>
      )}
    </div>
  );
}
