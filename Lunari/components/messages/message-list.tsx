"use client";

import { useLayoutEffect, useRef } from "react";
import { motion } from "motion/react";
import { MessageItem } from "@/components/messages/message-item";
import {
  MessageScrollerProvider,
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerButton,
} from "@/components/ui/message-scroller";
import type { Message } from "@/lib/types/database";
import type { ReactionPill } from "@/lib/hooks/use-message-reactions";
import type { MemberInfo } from "@/lib/types/member-info";

export function MessageList({
  messages,
  loading,
  membersById,
  reactionsByMessageId,
  onToggleReaction,
  onProfileClick,
  currentUserId,
  isAdminOrOwner = false,
  emptyIcon = "💬",
  emptyTitle = "No messages yet",
}: {
  messages: Message[];
  loading: boolean;
  membersById: Record<string, MemberInfo>;
  reactionsByMessageId: Record<string, ReactionPill[]>;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onProfileClick?: (userId: string) => void;
  currentUserId?: string;
  isAdminOrOwner?: boolean;
  emptyIcon?: string;
  emptyTitle?: string;
}) {
  // IDs recorded after each DOM commit — keeps render phase pure (no mutation)
  const seenIdsRef = useRef(new Set<string>());
  // True once the initial batch of messages has been committed to the DOM
  const initialLoadDoneRef = useRef(false);

  // Run after every commit so seenIds is always one render behind.
  // That one-render lag is exactly what makes new messages animate:
  // during the render they aren't in seenIds yet, animation plays, then we record them.
  useLayoutEffect(() => {
    messages.forEach((m) => seenIdsRef.current.add(m.id));
    if (messages.length > 0) initialLoadDoneRef.current = true;
  }, [messages]);

  if (loading) {
    return (
      <div className="flex-1 p-4 text-sm text-muted-foreground">Loading messages…</div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-muted text-2xl">
          {emptyIcon}
        </div>
        <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
        <p className="text-sm text-muted-foreground">
          Send a message to get the conversation started.
        </p>
      </div>
    );
  }

  return (
    <MessageScrollerProvider autoScroll defaultScrollPosition="end">
      <MessageScroller className="flex-1">
        <MessageScrollerViewport>
          <MessageScrollerContent className="gap-0 py-2">
            {messages.map((m) => {
              // A message is "new" only after the initial batch has been committed
              // and this ID hasn't been committed yet
              const isNew = initialLoadDoneRef.current && !seenIdsRef.current.has(m.id);

              return (
                <MessageScrollerItem key={m.id} messageId={m.id}>
                  <motion.div
                    initial={isNew ? { opacity: 0, y: 8 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                  >
                    <MessageItem
                      message={m}
                      senderName={membersById[m.sender_id]?.name ?? "Unknown"}
                      senderAvatarUrl={membersById[m.sender_id]?.avatarUrl}
                      reactions={reactionsByMessageId[m.id] ?? []}
                      onToggleReaction={(emoji) => onToggleReaction(m.id, emoji)}
                      membersById={membersById}
                      onProfileClick={onProfileClick}
                      currentUserId={currentUserId}
                      isAdminOrOwner={isAdminOrOwner}
                    />
                  </motion.div>
                </MessageScrollerItem>
              );
            })}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
    </MessageScrollerProvider>
  );
}
