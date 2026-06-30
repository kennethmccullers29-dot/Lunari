"use client";

import { useState } from "react";
import { Hash, UserPlus, PartyPopper } from "lucide-react";
import { Button } from "@/components/optics/button";
import { CreateChannelModal } from "@/components/channel/create-channel-modal";
import { InviteModal } from "@/components/invite/invite-modal";

export function WorkspaceSetupScreen({
  workspaceId,
  workspaceName,
  joinCode,
  members,
}: {
  workspaceId: string;
  workspaceName: string;
  joinCode: string;
  members: { id: string; display_name: string }[];
}) {
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10 text-3xl">
          <PartyPopper className="size-7 text-primary" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">
          Welcome to {workspaceName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This workspace is empty. Create a channel or invite your team to get started.
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <Button className="w-full" onClick={() => setShowCreateChannel(true)}>
            <Hash className="size-4" />
            Create your first channel
          </Button>
          <Button variant="secondary" className="w-full" onClick={() => setShowInvite(true)}>
            <UserPlus className="size-4" />
            Invite teammates
          </Button>
        </div>
      </div>

      {showCreateChannel && (
        <CreateChannelModal
          workspaceId={workspaceId}
          members={members}
          onClose={() => setShowCreateChannel(false)}
        />
      )}
      {showInvite && (
        <InviteModal
          workspaceId={workspaceId}
          workspaceName={workspaceName}
          initialJoinCode={joinCode}
          isOwnerOrAdmin={true}
          onClose={() => setShowInvite(false)}
        />
      )}
    </div>
  );
}
