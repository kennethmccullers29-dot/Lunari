"use client";

import { useEffect, useRef } from "react";
import { MessageItem } from "@/components/messages/message-item";
import type { Message } from "@/lib/types/database";
import type { ReactionPill } from "@/lib/hooks/use-message-reactions";
import type { MemberInfo } from "@/lib/types/member-info";

export function MessageList({
  messages,
  loading,
  membersById,
  reactionsByMessageId,
  onToggleReaction,
  emptyIcon = "💬",
  emptyTitle = "No messages yet",
}: {
  messages: Message[];
  loading: boolean;
  membersById: Record<string, MemberInfo>;
  reactionsByMessageId: Record<string, ReactionPill[]>;
  onToggleReaction: (messageId: string, emoji: string) => void;
  emptyIcon?: string;
  emptyTitle?: string;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  if (loading) {
    return (
      <div className="flex-1 p-4 text-sm text-neutral-400">Loading messages…</div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-muted text-2xl">
          {emptyIcon}
        </div>
        <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
        <p className="text-sm text-muted-foreground">Send a message to get the conversation started.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto py-2">
      {messages.map((m) => (
        <MessageItem
          key={m.id}
          message={m}
          senderName={membersById[m.sender_id]?.name ?? "Unknown"}
          senderAvatarUrl={membersById[m.sender_id]?.avatarUrl}
          reactions={reactionsByMessageId[m.id] ?? []}
          onToggleReaction={(emoji) => onToggleReaction(m.id, emoji)}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
