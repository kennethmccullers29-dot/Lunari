"use client";

import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/optics/avatar";
import { EmojiButton } from "@/components/emoji/emoji-button";
import { formatMessageText } from "@/lib/format-message";
import { editMessage, deleteMessage, adminDeleteMessage } from "@/lib/actions/messages";
import type { Message } from "@/lib/types/database";
import type { ReactionPill } from "@/lib/hooks/use-message-reactions";
import type { MemberInfo } from "@/lib/types/member-info";
import { File as FileIcon, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/optics/dropdown-menu";

export function MessageItem({
  message,
  senderName,
  senderAvatarUrl,
  reactions,
  onToggleReaction,
  membersById,
  onProfileClick,
  currentUserId,
  isAdminOrOwner = false,
}: {
  message: Message;
  senderName: string;
  senderAvatarUrl?: string | null;
  reactions: ReactionPill[];
  onToggleReaction: (emoji: string) => void;
  membersById?: Record<string, MemberInfo>;
  onProfileClick?: (userId: string) => void;
  currentUserId?: string;
  isAdminOrOwner?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isOwn = currentUserId != null && message.sender_id === currentUserId;
  const canEdit = isOwn;
  const canDelete = isOwn || isAdminOrOwner;

  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  const handleProfileClick = () => onProfileClick?.(message.sender_id);

  const startEdit = () => {
    setEditBody(message.body);
    setEditing(true);
    setConfirmDelete(false);
    setError(null);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditBody("");
  };

  const saveEdit = async () => {
    const trimmed = editBody.trim();
    if (!trimmed) return;
    if (trimmed === message.body) { cancelEdit(); return; }
    try {
      await editMessage(message.id, trimmed);
      setEditing(false);
    } catch {
      setError("Could not save edit");
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      saveEdit();
    } else if (e.key === "Escape") {
      cancelEdit();
    }
  };

  const handleDelete = async () => {
    try {
      if (isOwn) {
        await deleteMessage(message.id);
      } else {
        await adminDeleteMessage(message.id);
      }
    } catch {
      setError("Could not delete message");
      setConfirmDelete(false);
    }
  };

  // Auto-focus textarea when editing starts, cursor at end
  useEffect(() => {
    if (editing && textareaRef.current) {
      const el = textareaRef.current;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, [editing]);

  return (
    <div className="group relative flex gap-3 px-3 py-2 sm:px-5 hover:bg-muted/40">
      <button
        type="button"
        className="mt-0.5 shrink-0 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#611f69]"
        onClick={handleProfileClick}
        aria-label={`View ${senderName}'s profile`}
      >
        <Avatar size="lg" title={senderName}>
          {senderAvatarUrl && <AvatarImage src={senderAvatarUrl} width={40} height={40} alt="" />}
          <AvatarFallback className="bg-black text-white font-bold uppercase">
            {senderName.trim().charAt(0)}
          </AvatarFallback>
        </Avatar>
      </button>

      <div className="min-w-0 flex-1 pr-16 md:pr-0">
        <div className="flex items-baseline gap-2">
          <button
            type="button"
            className="text-[15px] font-bold text-foreground hover:underline focus:outline-none"
            onClick={handleProfileClick}
          >
            {senderName}
          </button>
          <span className="text-xs text-muted-foreground">{time}</span>
        </div>

        {editing ? (
          <div className="mt-1">
            <textarea
              ref={textareaRef}
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              onKeyDown={handleEditKeyDown}
              rows={Math.min(8, Math.max(2, editBody.split("\n").length))}
              className="w-full resize-none rounded-md border border-[#611f69] px-3 py-2 text-[15px] leading-snug text-foreground bg-background outline-none ring-1 ring-[#611f69]"
            />
            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                <kbd className="rounded bg-muted px-1">↵</kbd> save
                &nbsp;·&nbsp;
                <kbd className="rounded bg-muted px-1">esc</kbd> cancel
              </span>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded px-2 py-0.5 text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  className="rounded bg-[#611f69] px-2 py-0.5 text-white hover:bg-[#4a154b]"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {message.body && (
              <div className="whitespace-pre-wrap break-words text-[15px] leading-snug text-foreground">
                {formatMessageText(message.body)}
                {message.edited_at && (
                  <span className="ml-1 text-xs text-muted-foreground">(edited)</span>
                )}
              </div>
            )}

            {(message.attachment_type === "image" || message.attachment_type === "gif") &&
              message.attachment_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={message.attachment_url}
                  alt=""
                  loading="lazy"
                  className="mt-1 max-h-80 w-full max-w-sm rounded-lg object-contain"
                />
              )}

            {message.attachment_type === "file" && message.attachment_url && (
              <a
                href={message.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm hover:bg-muted"
              >
                <FileIcon className="size-4 shrink-0 text-muted-foreground" />
                <span className="max-w-[140px] truncate text-foreground/80 sm:max-w-[240px]">
                  {message.attachment_name ??
                    decodeURIComponent(
                      message.attachment_url.split("/").pop()?.split("?")[0] ?? "File"
                    )}
                </span>
              </a>
            )}

            {message.attachment_type === "voice" && message.attachment_url && (
              <div className="mt-1">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <audio src={message.attachment_url} controls className="h-10 w-full max-w-xs" />
              </div>
            )}
          </>
        )}

        {confirmDelete && (
          <div className="mt-1.5 flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-1.5 text-xs">
            <span className="text-destructive">Delete this message?</span>
            <button
              type="button"
              onClick={handleDelete}
              className="font-semibold text-destructive underline hover:opacity-80"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        )}

        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

        {reactions.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {reactions.map((r) => {
              const names =
                membersById && r.reactorIds
                  ? r.reactorIds
                      .map((uid) => membersById[uid]?.name ?? "Unknown")
                      .join(", ")
                  : undefined;

              return (
                <button
                  key={r.emoji}
                  type="button"
                  onClick={() => onToggleReaction(r.emoji)}
                  title={names}
                  className={clsx(
                    "flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
                    r.reactedByMe
                      ? "border-[#611f69] bg-[#611f69]/10 text-[#611f69]"
                      : "border-border bg-muted/50 text-muted-foreground hover:bg-muted"
                  )}
                >
                  <span>{r.emoji}</span>
                  <span>{r.count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {!editing && (
        <>
          {/* Desktop: hover action strip */}
          <div className="absolute right-2 top-1 hidden items-center gap-0.5 rounded-lg border border-border bg-background p-0.5 shadow-sm opacity-0 transition-opacity group-hover:opacity-100 md:flex">
            <EmojiButton onSelect={onToggleReaction} label="Add reaction" align="end" />
            {canEdit && (
              <button
                type="button"
                title="Edit message"
                onClick={startEdit}
                className="flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Pencil className="size-3.5" />
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                title="Delete message"
                onClick={() => { setConfirmDelete(true); setEditing(false); }}
                className="flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>

          {/* Mobile: compact emoji + ⋯ dropdown always visible */}
          <div className="absolute right-1 top-1 flex items-center gap-0.5 md:hidden">
            <EmojiButton onSelect={onToggleReaction} label="Add reaction" align="end" />
            {(canEdit || canDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      type="button"
                      className="flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-muted"
                    >
                      <MoreHorizontal className="size-4" />
                    </button>
                  }
                />
                <DropdownMenuContent align="end">
                  {canEdit && (
                    <DropdownMenuItem onClick={startEdit}>
                      <Pencil className="size-3.5" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {canEdit && canDelete && <DropdownMenuSeparator />}
                  {canDelete && (
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => { setConfirmDelete(true); setEditing(false); }}
                    >
                      <Trash2 className="size-3.5" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </>
      )}
    </div>
  );
}
