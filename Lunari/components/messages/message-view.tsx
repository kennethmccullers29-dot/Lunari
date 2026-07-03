"use client";

import { useMessages, type Target } from "@/lib/hooks/use-messages";
import { useMessageReactions } from "@/lib/hooks/use-message-reactions";
import { useTypingIndicator } from "@/lib/hooks/use-typing-indicator";
import { MessageList } from "@/components/messages/message-list";
import { RichComposer } from "@/components/messages/rich-composer";
import { TypingIndicator } from "@/components/messages/typing-indicator";
import type { MemberInfo } from "@/lib/types/member-info";

export function MessageView({
  target,
  membersById,
  currentUserId,
  isAdminOrOwner = false,
  placeholder = "Message…",
  emptyIcon,
  emptyTitle,
  onProfileClick,
}: {
  target: Target;
  membersById: Record<string, MemberInfo>;
  currentUserId: string;
  isAdminOrOwner?: boolean;
  placeholder?: string;
  emptyIcon?: string;
  emptyTitle?: string;
  onProfileClick?: (userId: string) => void;
}) {
  const { messages, sendMessage, loading } = useMessages(target);
  const { reactionsByMessageId, toggleReaction } = useMessageReactions(target);
  const { typingUserIds, notifyTyping } = useTypingIndicator(target, currentUserId);

  const typingNames = typingUserIds
    .map((id) => membersById[id]?.name)
    .filter((name): name is string => !!name);

  const members = Object.entries(membersById).map(([id, info]) => ({
    id,
    label: info.name,
  }));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MessageList
        messages={messages}
        loading={loading}
        membersById={membersById}
        reactionsByMessageId={reactionsByMessageId}
        onToggleReaction={toggleReaction}
        onProfileClick={onProfileClick}
        currentUserId={currentUserId}
        isAdminOrOwner={isAdminOrOwner}
        emptyIcon={emptyIcon}
        emptyTitle={emptyTitle}
      />
      <TypingIndicator names={typingNames} />
      <RichComposer
        onSend={sendMessage}
        onTyping={notifyTyping}
        placeholder={placeholder}
        members={members}
      />
    </div>
  );
}
