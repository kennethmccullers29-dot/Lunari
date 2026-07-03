"use client";

import { useState } from "react";
import { X, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/optics/button";
import { Input } from "@/components/optics/input";
import { createTag, deleteTag } from "@/lib/actions/forum";
import { TAG_COLORS, TAG_COLOR_OPTIONS } from "@/lib/types/forum";
import type { ForumTag } from "@/lib/types/forum";

export function ManageTagsModal({
  channelId,
  tags: initialTags,
  onClose,
  onTagCreated,
  onTagDeleted,
}: {
  channelId: string;
  tags: ForumTag[];
  onClose: () => void;
  onTagCreated: (tag: ForumTag) => void;
  onTagDeleted: (tagId: string) => void;
}) {
  const [tags, setTags] = useState(initialTags);
  const [name, setName] = useState("");
  const [color, setColor] = useState("blue");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    const result = await createTag(channelId, name.trim(), color);
    if ("error" in result) { setError(result.error); setSaving(false); return; }
    const newTag = { id: result.id, name: name.trim(), color };
    setTags((prev) => [...prev, newTag]);
    onTagCreated(newTag);
    setName("");
    setColor("blue");
    setSaving(false);
  };

  const handleDelete = async (tagId: string) => {
    const result = await deleteTag(tagId);
    if (!result.error) {
      setTags((prev) => prev.filter((t) => t.id !== tagId));
      onTagDeleted(tagId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-background shadow-2xl ring-1 ring-foreground/10">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-base font-semibold">Manage tags</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted">
            <X className="size-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Existing tags */}
          {tags.length > 0 ? (
            <div className="space-y-1.5">
              {tags.map((t) => (
                <div key={t.id} className="flex items-center gap-2">
                  <span
                    className={`flex-1 rounded-full px-2.5 py-1 text-xs font-medium ${TAG_COLORS[t.color] ?? TAG_COLORS.gray}`}
                  >
                    {t.name}
                  </span>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No tags yet.</p>
          )}

          <hr />

          {/* Create new tag */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">New tag</p>
            <Input
              placeholder="Tag name"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent) => { if (e.key === "Enter") handleCreate(); }}
            />
            <div className="flex flex-wrap gap-1.5">
              {TAG_COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`size-5 rounded-full ${TAG_COLORS[c]} ${color === c ? "ring-2 ring-offset-1 ring-foreground/30 scale-110" : "opacity-50 hover:opacity-80"}`}
                  title={c}
                />
              ))}
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={saving || !name.trim()}
              className="w-full"
            >
              <Plus className="size-3.5" />
              {saving ? "Adding…" : "Add tag"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
