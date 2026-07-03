"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { Button } from "@/components/optics/button";
import { Input } from "@/components/optics/input";
import { createPost, createTag } from "@/lib/actions/forum";
import { TAG_COLORS, TAG_COLOR_OPTIONS } from "@/lib/types/forum";
import type { ForumTag } from "@/lib/types/forum";

export function CreatePostModal({
  channelId,
  workspaceId,
  tags,
  onClose,
  onTagCreated,
}: {
  channelId: string;
  workspaceId: string;
  tags: ForumTag[];
  onClose: () => void;
  onTagCreated: (tag: ForumTag) => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New tag form
  const [addingTag, setAddingTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("blue");
  const [tagSaving, setTagSaving] = useState(false);

  const toggleTag = (id: string) =>
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );

  const handleSubmit = async () => {
    if (!title.trim()) { setError("Title is required"); return; }
    setSaving(true);
    setError(null);
    const fd = new FormData();
    fd.set("channel_id", channelId);
    fd.set("workspace_id", workspaceId);
    fd.set("title", title.trim());
    fd.set("body", body.trim());
    for (const id of selectedTagIds) fd.append("tag_ids", id);
    const result = await createPost(fd);
    if (result?.error) { setError(result.error); setSaving(false); }
    // on success: server redirects to the new post
  };

  const handleAddTag = async () => {
    if (!newTagName.trim()) return;
    setTagSaving(true);
    const result = await createTag(channelId, newTagName.trim(), newTagColor);
    if ("error" in result) {
      setTagSaving(false);
      return;
    }
    onTagCreated({ id: result.id, name: newTagName.trim(), color: newTagColor });
    setNewTagName("");
    setNewTagColor("blue");
    setAddingTag(false);
    setTagSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-background shadow-2xl ring-1 ring-foreground/10">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-base font-semibold">New post</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted">
            <X className="size-4" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto">
          <div className="space-y-4 p-5">
            {/* Title */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Title</label>
              <Input
                autoFocus
                placeholder="Post title…"
                value={title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
              />
            </div>

            {/* Body */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Body <span className="text-muted-foreground/60">(optional)</span>
              </label>
              <textarea
                placeholder="Describe the topic, share context, ask your question…"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>

            {/* Tags */}
            {(tags.length > 0 || addingTag) && (
              <div>
                <label className="mb-2 block text-xs font-medium text-muted-foreground">Tags</label>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t) => {
                    const active = selectedTagIds.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleTag(t.id)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                          active
                            ? `${TAG_COLORS[t.color] ?? TAG_COLORS.gray} ring-2 ring-offset-1 ring-foreground/20`
                            : "bg-muted text-muted-foreground hover:bg-muted/70"
                        }`}
                      >
                        {t.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Add tag inline */}
            {addingTag ? (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">New tag</p>
                <Input
                  autoFocus
                  placeholder="Tag name"
                  value={newTagName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTagName(e.target.value)}
                  onKeyDown={(e: React.KeyboardEvent) => { if (e.key === "Enter") handleAddTag(); if (e.key === "Escape") setAddingTag(false); }}
                />
                <div className="flex flex-wrap gap-1.5">
                  {TAG_COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewTagColor(c)}
                      className={`size-5 rounded-full ${TAG_COLORS[c]} ${newTagColor === c ? "ring-2 ring-offset-1 ring-foreground/30 scale-110" : "opacity-60 hover:opacity-90"}`}
                      title={c}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddTag} disabled={tagSaving || !newTagName.trim()}>
                    {tagSaving ? "Adding…" : "Add tag"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setAddingTag(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingTag(true)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <Plus className="size-3" /> Add a tag
              </button>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t px-5 py-4">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={saving || !title.trim()}>
            {saving ? "Posting…" : "Create post"}
          </Button>
        </div>
      </div>
    </div>
  );
}
