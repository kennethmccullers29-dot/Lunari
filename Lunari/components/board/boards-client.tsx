"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutGrid, Plus, Lock } from "lucide-react";
import { Button } from "@/components/optics/button";
import { Input } from "@/components/optics/input";
import { createBoard } from "@/lib/actions/boards";
import {
  Dialog,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/optics/dialog";

type Board = { id: string; name: string; description: string | null; is_private: boolean };

const BOARD_COLORS = [
  "from-violet-500 to-purple-600",
  "from-sky-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-indigo-500 to-blue-700",
];

function boardColor(id: string) {
  const hash = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return BOARD_COLORS[hash % BOARD_COLORS.length];
}

export function BoardsClient({
  workspaceId,
  boards,
}: {
  workspaceId: string;
  boards: Board[];
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b px-6 py-3.5">
        <div className="flex items-center gap-2">
          <LayoutGrid className="size-5 text-muted-foreground" />
          <h1 className="text-sm font-semibold">Boards</h1>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="size-3.5" />
          New board
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {boards.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted text-2xl">
              📋
            </div>
            <p className="text-sm font-medium">No boards yet</p>
            <p className="text-sm text-muted-foreground">Create a board to organize your team&apos;s work.</p>
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" />
              Create your first board
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {boards.map((b) => (
              <Link
                key={b.id}
                href={`/w/${workspaceId}/boards/${b.id}`}
                className={`relative flex h-28 flex-col justify-end rounded-xl bg-gradient-to-br p-3 text-white shadow-sm transition-opacity hover:opacity-90 ${boardColor(b.id)}`}
              >
                {b.is_private && (
                  <Lock className="absolute right-2.5 top-2.5 size-3.5 opacity-70" />
                )}
                <span className="truncate text-sm font-semibold drop-shadow">{b.name}</span>
                {b.description && (
                  <span className="truncate text-xs opacity-75">{b.description}</span>
                )}
              </Link>
            ))}
            <button
              onClick={() => setCreating(true)}
              className="flex h-28 items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/30 text-sm text-muted-foreground hover:border-muted-foreground/60 hover:text-foreground transition-colors"
            >
              <Plus className="size-4 mr-1" />
              New board
            </button>
          </div>
        )}
      </div>

      {creating && (
        <Dialog open onOpenChange={(open: boolean) => { if (!open) { setCreating(false); setCreateError(null); } }}>
          <DialogPopup className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Create a board</DialogTitle>
              <DialogDescription>Organize your team&apos;s work with columns and cards.</DialogDescription>
            </DialogHeader>
            <form
              id="create-board-form"
              action={async (fd) => {
                setSaving(true);
                setCreateError(null);
                fd.set("workspace_id", workspaceId);
                fd.set("is_private", String(isPrivate));
                const result = await createBoard(fd);
                if (result && "error" in result) {
                  setCreateError(result.error);
                  setSaving(false);
                }
              }}
              className="space-y-3"
            >
              <input type="hidden" name="workspace_id" value={workspaceId} />
              <input type="hidden" name="is_private" value={String(isPrivate)} />
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Board name</label>
                <Input
                  name="name"
                  value={name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                  placeholder="e.g. Product Roadmap"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Description (optional)</label>
                <Input
                  name="description"
                  value={description}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
                  placeholder="What is this board for?"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                />
                <Lock className="size-3.5 text-muted-foreground" />
                Private board
              </label>
            </form>
            <DialogFooter>
              {createError && (
                <p className="mb-2 text-sm text-destructive">{createError}</p>
              )}
              <Button type="submit" form="create-board-form" className="w-full" disabled={saving}>
                {saving ? "Creating…" : "Create board"}
              </Button>
            </DialogFooter>
          </DialogPopup>
        </Dialog>
      )}
    </div>
  );
}
