"use client";

import { startDm } from "@/lib/actions/dms";
import {
  Dialog,
  DialogPopup,
  DialogHeader,
  DialogTitle,
} from "@/components/optics/dialog";
import { Button } from "@/components/optics/button";

export function StartDmModal({
  workspaceId,
  members,
  onClose,
}: {
  workspaceId: string;
  members: { id: string; display_name: string }[];
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>New message</DialogTitle>
        </DialogHeader>
        <form action={startDm} className="space-y-3">
          <input type="hidden" name="workspace_id" value={workspaceId} />
          <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-neutral-200 p-2">
            {members.length === 0 && (
              <p className="text-sm text-neutral-500">No other members yet.</p>
            )}
            {members.map((m) => (
              <label key={m.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="member_ids" value={m.id} />
                {m.display_name}
              </label>
            ))}
          </div>
          <Button type="submit" className="w-full" disabled={members.length === 0}>
            Start conversation
          </Button>
        </form>
      </DialogPopup>
    </Dialog>
  );
}
