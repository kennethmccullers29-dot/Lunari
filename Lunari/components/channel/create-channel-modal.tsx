"use client";

import { useState } from "react";
import { createChannel } from "@/lib/actions/channels";
import { Hash, Mic } from "lucide-react";
import {
  Dialog,
  DialogPopup,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/optics/dialog";
import { Input } from "@/components/optics/input";
import { Button } from "@/components/optics/button";
import { Label } from "@/components/optics/label";

export function CreateChannelModal({
  workspaceId,
  members,
  onClose,
}: {
  workspaceId: string;
  members: { id: string; display_name: string }[];
  onClose: () => void;
}) {
  const [isPrivate, setIsPrivate] = useState(false);
  const [channelType, setChannelType] = useState<"text" | "voice">("text");

  return (
    <Dialog open onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>Create a channel</DialogTitle>
          <DialogDescription>Create a new channel to get started.</DialogDescription>
        </DialogHeader>
        <form id="create-channel-form" action={createChannel} className="space-y-3">
          <input type="hidden" name="workspace_id" value={workspaceId} />
          <input type="hidden" name="type" value={channelType} />

          <div className="grid grid-cols-2 gap-2">
            {(["text", "voice"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setChannelType(t)}
                className={`flex items-center gap-2 rounded-lg border p-3 text-sm transition-colors ${
                  channelType === t
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-neutral-200 text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50"
                }`}
              >
                {t === "text" ? <Hash className="size-4 shrink-0" /> : <Mic className="size-4 shrink-0" />}
                <span className="font-medium capitalize">{t}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-sm mb-1 font-medium">Name</Label>
            <Input className="col-span-3" type="text" name="name" required placeholder={channelType === "voice" ? "e.g. lounge" : "e.g. general"} />
          </div>
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              name="is_private"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
            />
            Private channel
          </label>
          {isPrivate && (
            <div>
              <p className="mb-1 text-sm font-medium text-neutral-700">Add members</p>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-neutral-200 p-2">
                {members.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="member_ids" value={m.id} />
                    {m.display_name}
                  </label>
                ))}
              </div>
            </div>
          )}
         
        </form>
         <DialogFooter>
         <Button type="submit" form="create-channel-form" className="w-full">
            Create
          </Button>
      </DialogFooter>
      </DialogPopup>

    </Dialog>
  );
}
