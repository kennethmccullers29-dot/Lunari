"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, MessageSquare, Lock, Trash2, Send, Pin } from "lucide-react";
import { Button } from "@/components/optics/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/optics/avatar";
import { addReply, deleteReply, deletePost } from "@/lib/actions/forum";
import { TAG_COLORS } from "@/lib/types/forum";
import type { ForumPost, ForumReply, ForumAuthor } from "@/lib/types/forum";

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

function AuthorAvatar({ author, size = "md" }: { author: ForumAuthor; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "size-7" : "size-9";
  const textCls = size === "sm" ? "text-[10px]" : "text-sm";
  return (
    <Avatar className={`${cls} shrink-0`}>
      {author.avatar_url && <AvatarImage src={author.avatar_url} width={size === "sm" ? 28 : 36} height={size === "sm" ? 28 : 36} alt="" />}
      <AvatarFallback className={`bg-black text-white font-bold uppercase ${textCls}`}>
        {author.display_name.charAt(0)}
      </AvatarFallback>
    </Avatar>
  );
}

export function ForumPostView({
  post: initialPost,
  replies: initialReplies,
  channelId,
  channelName,
  workspaceId,
  currentUser,
}: {
  post: ForumPost;
  replies: ForumReply[];
  channelId: string;
  channelName: string;
  workspaceId: string;
  currentUser: ForumAuthor;
}) {
  const [post] = useState(initialPost);
  const [replies, setReplies] = useState(initialReplies);
  const [replyBody, setReplyBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const handleSubmitReply = async () => {
    const body = replyBody.trim();
    if (!body) return;
    setSubmitting(true);
    setReplyError(null);
    const result = await addReply(post.id, body);
    if ("error" in result) {
      setReplyError(result.error);
      setSubmitting(false);
      return;
    }
    setReplies((prev) => [
      ...prev,
      {
        id: result.id,
        post_id: post.id,
        author_id: currentUser.id,
        body,
        created_at: result.created_at,
        author: currentUser,
      },
    ]);
    setReplyBody("");
    setSubmitting(false);
  };

  const handleDeleteReply = async (replyId: string) => {
    const result = await deleteReply(replyId);
    if (!result.error) {
      setReplies((prev) => prev.filter((r) => r.id !== replyId));
    }
  };

  const handleDeletePost = async () => {
    if (!confirm("Delete this post and all its replies?")) return;
    await deletePost(post.id, workspaceId, channelId);
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <Link
          href={`/w/${workspaceId}/c/${channelId}`}
          className="mb-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground w-fit"
        >
          <ChevronLeft className="size-3" />
          Back to #{channelName}
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {post.is_pinned && <Pin className="size-3.5 text-muted-foreground shrink-0" />}
              <h1 className="text-xl font-semibold">{post.title}</h1>
              {post.is_closed && (
                <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                  <Lock className="size-3" /> Closed
                </span>
              )}
            </div>
            {post.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {post.tags.map((t) => (
                  <span
                    key={t.id}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TAG_COLORS[t.color] ?? TAG_COLORS.gray}`}
                  >
                    {t.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          {post.author_id === currentUser.id && (
            <button
              onClick={handleDeletePost}
              className="shrink-0 text-muted-foreground hover:text-destructive"
              title="Delete post"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Original post body */}
        <div className="border-b px-6 py-5">
          <div className="flex items-start gap-3">
            <AuthorAvatar author={post.author} />
            <div className="flex-1 min-w-0">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-sm font-semibold">{post.author.display_name}</span>
                <span className="text-xs text-muted-foreground">{relativeTime(post.created_at)}</span>
              </div>
              {post.body ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.body}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No description.</p>
              )}
            </div>
          </div>
        </div>

        {/* Replies */}
        <div className="px-6 py-4 space-y-4">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <MessageSquare className="size-3.5" />
            {replies.length} {replies.length === 1 ? "reply" : "replies"}
          </div>

          {replies.map((reply) => (
            <div key={reply.id} className="group flex items-start gap-3">
              <AuthorAvatar author={reply.author} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="mb-0.5 flex items-center gap-2">
                  <span className="text-sm font-medium">{reply.author.display_name}</span>
                  <span className="text-xs text-muted-foreground">{relativeTime(reply.created_at)}</span>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{reply.body}</p>
              </div>
              {reply.author_id === currentUser.id && (
                <button
                  onClick={() => handleDeleteReply(reply.id)}
                  className="mt-1 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Reply composer */}
      <div className="border-t p-4">
        {post.is_closed ? (
          <p className="text-center text-sm text-muted-foreground">
            <Lock className="mr-1 inline size-3.5" />
            This post is closed for replies.
          </p>
        ) : (
          <div className="flex items-end gap-2">
            <AuthorAvatar author={currentUser} size="sm" />
            <div className="flex-1">
              <textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder="Write a reply… (Ctrl+Enter to submit)"
                rows={2}
                className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmitReply();
                }}
              />
              {replyError && <p className="mt-1 text-xs text-destructive">{replyError}</p>}
            </div>
            <Button
              size="sm"
              onClick={handleSubmitReply}
              disabled={submitting || !replyBody.trim()}
            >
              <Send className="size-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
