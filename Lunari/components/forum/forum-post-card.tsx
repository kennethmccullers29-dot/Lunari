"use client";

import Link from "next/link";
import { MessageSquare, Pin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/optics/avatar";
import { TAG_COLORS } from "@/lib/types/forum";
import type { ForumPost } from "@/lib/types/forum";

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function ForumPostCard({
  post,
  workspaceId,
  channelId,
}: {
  post: ForumPost;
  workspaceId: string;
  channelId: string;
}) {
  return (
    <Link
      href={`/w/${workspaceId}/c/${channelId}/${post.id}`}
      className="flex items-start gap-4 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/40"
    >
      {/* Author avatar */}
      <Avatar className="mt-0.5 shrink-0">
        {post.author.avatar_url && (
          <AvatarImage src={post.author.avatar_url} width={36} height={36} alt="" />
        )}
        <AvatarFallback className="bg-black text-white text-sm font-bold uppercase">
          {post.author.display_name.charAt(0)}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {post.is_pinned && (
              <Pin className="size-3.5 shrink-0 text-muted-foreground rotate-45" />
            )}
            <h3 className="truncate text-sm font-semibold">{post.title}</h3>
            {post.is_closed && (
              <span className="shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                closed
              </span>
            )}
          </div>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {relativeTime(post.last_activity_at)}
          </span>
        </div>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {post.tags.map((t) => (
              <span
                key={t.id}
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${TAG_COLORS[t.color] ?? TAG_COLORS.gray}`}
              >
                {t.name}
              </span>
            ))}
          </div>
        )}

        {/* Meta row */}
        <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            by <span className="font-medium text-foreground/70">{post.author.display_name}</span>
            {" · "}
            {relativeTime(post.created_at)}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="size-3" />
            {post.reply_count}
          </span>
        </div>
      </div>
    </Link>
  );
}
