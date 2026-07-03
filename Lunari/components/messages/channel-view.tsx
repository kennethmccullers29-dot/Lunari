"use client";

import { useState, type ReactNode } from "react";
import { MessageView } from "@/components/messages/message-view";
import { UserProfilePanel } from "@/components/messages/user-profile-panel";
import type { Target } from "@/lib/hooks/use-messages";
import type { MemberInfo } from "@/lib/types/member-info";

export function ChannelView({
  header,
  target,
  membersById,
  currentUserId,
  isAdminOrOwner = false,
  placeholder,
  emptyIcon,
  emptyTitle,
}: {
  header: ReactNode;
  target: Target;
  membersById: Record<string, MemberInfo>;
  currentUserId: string;
  isAdminOrOwner?: boolean;
  placeholder?: string;
  emptyIcon?: string;
  emptyTitle?: string;
}) {
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  return (
    <div className="flex min-h-0 flex-1">
      {/* Main content column: header + messages */}
      <div className="flex min-h-0 flex-1 flex-col">
        {header}
        <MessageView
          target={target}
          membersById={membersById}
          currentUserId={currentUserId}
          isAdminOrOwner={isAdminOrOwner}
          placeholder={placeholder}
          emptyIcon={emptyIcon}
          emptyTitle={emptyTitle}
          onProfileClick={setProfileUserId}
        />
      </div>

      {/* Profile panel — spans full height alongside header + messages */}
      {profileUserId && (
        <UserProfilePanel
          userId={profileUserId}
          onClose={() => setProfileUserId(null)}
        />
      )}
    </div>
  );
}
