"use client";

import { useMemo, useState } from "react";
import { Plus, Tag, LayoutList } from "lucide-react";
import { Button } from "@/components/optics/button";
import { ForumPostCard } from "@/components/forum/forum-post-card";
import { CreatePostModal } from "@/components/forum/create-post-modal";
import { ManageTagsModal } from "@/components/forum/manage-tags-modal";
import { TAG_COLORS } from "@/lib/types/forum";
import type { ForumPost, ForumTag } from "@/lib/types/forum";

type SortOrder = "activity" | "newest" | "replies";

export function ForumPostList({
  channelId,
  channelName,
  workspaceId,
  initialPosts,
  initialTags,
}: {
  channelId: string;
  channelName: string;
  workspaceId: string;
  initialPosts: ForumPost[];
  initialTags: ForumTag[];
}) {
  const [tags, setTags] = useState<ForumTag[]>(initialTags);
  const [createOpen, setCreateOpen] = useState(false);
  const [manageTagsOpen, setManageTagsOpen] = useState(false);
  const [sort, setSort] = useState<SortOrder>("activity");
  const [filterTagId, setFilterTagId] = useState<string | null>(null);

  const sorted = useMemo(() => {
    const filtered = filterTagId
      ? initialPosts.filter((p) => p.tags.some((t) => t.id === filterTagId))
      : initialPosts;

    return [...filtered].sort((a, b) => {
      if (sort === "newest")
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sort === "replies") return b.reply_count - a.reply_count;
      return new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime();
    });
  }, [initialPosts, sort, filterTagId]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-3.5">
        <div className="flex items-center gap-2">
          <LayoutList className="size-5 text-muted-foreground" />
          <h1 className="text-sm font-semibold"># {channelName}</h1>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-3.5" />
          New post
        </Button>
      </div>

      {/* Filter toolbar */}
      <div className="flex items-center gap-2 border-b px-6 py-2 flex-wrap">
        {/* All filter */}
        <button
          onClick={() => setFilterTagId(null)}
          className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
            !filterTagId
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/70"
          }`}
        >
          All
        </button>

        {/* Tag filters */}
        {tags.map((t) => (
          <button
            key={t.id}
            onClick={() => setFilterTagId(filterTagId === t.id ? null : t.id)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
              filterTagId === t.id
                ? `${TAG_COLORS[t.color] ?? TAG_COLORS.gray} ring-2 ring-offset-1 ring-foreground/20`
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {t.name}
          </button>
        ))}

        <div className="flex-1" />

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOrder)}
          className="rounded-md border bg-background px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-ring/40"
        >
          <option value="activity">Latest activity</option>
          <option value="newest">Newest</option>
          <option value="replies">Most replies</option>
        </select>

        {/* Manage tags */}
        <button
          onClick={() => setManageTagsOpen(true)}
          title="Manage tags"
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Tag className="size-3.5" />
        </button>
      </div>

      {/* Post list */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted text-2xl">
              💬
            </div>
            <p className="text-sm font-medium">
              {filterTagId ? "No posts with this tag" : "No posts yet"}
            </p>
            <p className="text-sm text-muted-foreground">
              {filterTagId
                ? "Try selecting a different tag or clear the filter."
                : "Start a conversation — create the first post."}
            </p>
            {!filterTagId && (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                Create first post
              </Button>
            )}
          </div>
        ) : (
          sorted.map((post) => (
            <ForumPostCard
              key={post.id}
              post={post}
              workspaceId={workspaceId}
              channelId={channelId}
            />
          ))
        )}
      </div>

      {createOpen && (
        <CreatePostModal
          channelId={channelId}
          workspaceId={workspaceId}
          tags={tags}
          onClose={() => setCreateOpen(false)}
          onTagCreated={(tag) => setTags((prev) => [...prev, tag])}
        />
      )}

      {manageTagsOpen && (
        <ManageTagsModal
          channelId={channelId}
          tags={tags}
          onClose={() => setManageTagsOpen(false)}
          onTagCreated={(tag) => setTags((prev) => [...prev, tag])}
          onTagDeleted={(id) => setTags((prev) => prev.filter((t) => t.id !== id))}
        />
      )}
    </div>
  );
}
