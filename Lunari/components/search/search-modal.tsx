"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { Hash, Lock, MessageSquare, Search, Users, X } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/optics/avatar";
import { searchWorkspace, type SearchResult } from "@/lib/actions/search";

// Strip markdown and mention syntax for plain-text preview
function preview(body: string): string {
  return body
    .replace(/@\[([^\]]+)\]\([^)]+\)/g, "@$1")
    .replace(/```[\s\S]*?```/g, "[code]")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/_([^_\n]+)_/g, "$1")
    .replace(/~([^~\n]+)~/g, "$1")
    .replace(/`([^`\n]+)`/g, "$1")
    .replace(/\n+/g, " ")
    .trim()
    .slice(0, 100);
}

type FlatItem =
  | { kind: "channel"; id: string; name: string; isPrivate: boolean }
  | { kind: "member"; id: string; displayName: string; avatarUrl: string | null; title: string | null }
  | { kind: "message"; id: string; body: string; senderName: string; channelId: string | null; channelName: string | null; dmConversationId: string | null };

export function SearchModal({
  workspaceId,
  onClose,
}: {
  workspaceId: string;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Focus input on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults(null); setLoading(false); return; }
    setLoading(true);
    const data = await searchWorkspace(workspaceId, q);
    setResults(data);
    setLoading(false);
    setSelectedIndex(0);
  }, [workspaceId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(q), 280);
  };

  // Flatten results for unified keyboard nav
  const flat: FlatItem[] = results ? [
    ...results.channels.map(c => ({ kind: "channel" as const, id: c.id, name: c.name, isPrivate: c.isPrivate })),
    ...results.members.map(m => ({ kind: "member" as const, id: m.id, displayName: m.displayName, avatarUrl: m.avatarUrl, title: m.title })),
    ...results.messages.map(m => ({ kind: "message" as const, id: m.id, body: m.body, senderName: m.senderName, channelId: m.channelId, channelName: m.channelName, dmConversationId: m.dmConversationId })),
  ] : [];

  const navigateTo = useCallback((item: FlatItem) => {
    if (item.kind === "channel") {
      router.push(`/w/${workspaceId}/c/${item.id}`);
    } else if (item.kind === "message") {
      if (item.channelId) router.push(`/w/${workspaceId}/c/${item.channelId}`);
      else if (item.dmConversationId) router.push(`/w/${workspaceId}/dm/${item.dmConversationId}`);
    }
    // members: no navigation for now — just close
    onClose();
  }, [workspaceId, router, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(i => {
        const next = Math.min(i + 1, flat.length - 1);
        scrollItemIntoView(next);
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(i => {
        const next = Math.max(i - 1, 0);
        scrollItemIntoView(next);
        return next;
      });
    } else if (e.key === "Enter" && flat[selectedIndex]) {
      e.preventDefault();
      navigateTo(flat[selectedIndex]);
    }
  };

  const scrollItemIntoView = (index: number) => {
    const el = listRef.current?.querySelector(`[data-index="${index}"]`);
    el?.scrollIntoView({ block: "nearest" });
  };

  const hasResults = flat.length > 0;
  const showEmpty = results && !hasResults;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-[2px] pt-[14vh]"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-xl rounded-xl border border-neutral-200 bg-white shadow-2xl overflow-hidden"
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Input row */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-neutral-100">
          <Search className="size-4 shrink-0 text-neutral-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Search messages, channels, people…"
            className="flex-1 bg-transparent text-[15px] text-neutral-900 outline-none placeholder:text-neutral-400"
          />
          {loading && (
            <div className="size-4 shrink-0 animate-spin rounded-full border-2 border-neutral-200 border-t-[#611f69]" />
          )}
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded p-0.5 text-neutral-400 hover:text-neutral-600"
            aria-label="Close search"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Results list */}
        {hasResults && (
          <div ref={listRef} className="max-h-[56vh] overflow-y-auto py-2">
            {/* Channels */}
            {results!.channels.length > 0 && (
              <section>
                <p className="flex items-center gap-1.5 px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
                  <Hash className="size-3" /> Channels
                </p>
                {results!.channels.map((ch, i) => {
                  const idx = i;
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      data-index={idx}
                      onClick={() => navigateTo(flat[idx])}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={clsx(
                        "flex w-full items-center gap-3 px-4 py-2 text-sm",
                        idx === selectedIndex ? "bg-[#611f69]/10" : "hover:bg-neutral-50"
                      )}
                    >
                      {ch.isPrivate
                        ? <Lock className="size-4 shrink-0 text-neutral-400" />
                        : <Hash className="size-4 shrink-0 text-neutral-400" />}
                      <span className={clsx("font-medium", idx === selectedIndex ? "text-[#611f69]" : "text-neutral-800")}>
                        {ch.name}
                      </span>
                    </button>
                  );
                })}
              </section>
            )}

            {/* People */}
            {results!.members.length > 0 && (
              <section>
                <p className="flex items-center gap-1.5 px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
                  <Users className="size-3" /> People
                </p>
                {results!.members.map((m, i) => {
                  const idx = results!.channels.length + i;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      data-index={idx}
                      onClick={() => navigateTo(flat[idx])}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={clsx(
                        "flex w-full items-center gap-3 px-4 py-2 text-sm",
                        idx === selectedIndex ? "bg-[#611f69]/10" : "hover:bg-neutral-50"
                      )}
                    >
                      <Avatar size="sm" className="size-6">
                        {m.avatarUrl && <AvatarImage src={m.avatarUrl} width={24} height={24} alt="" />}
                        <AvatarFallback className="text-[10px] font-bold">
                          {m.displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex min-w-0 items-baseline gap-2">
                        <span className={clsx("font-medium", idx === selectedIndex ? "text-[#611f69]" : "text-neutral-800")}>
                          {m.displayName}
                        </span>
                        {m.title && (
                          <span className="truncate text-xs text-neutral-400">{m.title}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </section>
            )}

            {/* Messages */}
            {results!.messages.length > 0 && (
              <section>
                <p className="flex items-center gap-1.5 px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
                  <MessageSquare className="size-3" /> Messages
                </p>
                {results!.messages.map((msg, i) => {
                  const idx = results!.channels.length + results!.members.length + i;
                  return (
                    <button
                      key={msg.id}
                      type="button"
                      data-index={idx}
                      onClick={() => navigateTo(flat[idx])}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={clsx(
                        "flex w-full flex-col gap-0.5 px-4 py-2 text-left text-sm",
                        idx === selectedIndex ? "bg-[#611f69]/10" : "hover:bg-neutral-50"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className={clsx("font-medium", idx === selectedIndex ? "text-[#611f69]" : "text-neutral-800")}>
                          {msg.senderName}
                        </span>
                        {msg.channelName && (
                          <span className="text-xs text-neutral-400">in #{msg.channelName}</span>
                        )}
                        <span className="ml-auto text-xs text-neutral-300">
                          {new Date(msg.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      <p className="text-neutral-500 line-clamp-1">{preview(msg.body)}</p>
                    </button>
                  );
                })}
              </section>
            )}
          </div>
        )}

        {/* Empty state */}
        {showEmpty && (
          <div className="px-4 py-10 text-center text-sm text-neutral-400">
            No results for <span className="font-medium text-neutral-600">&ldquo;{query}&rdquo;</span>
          </div>
        )}

        {/* Default hint (no query yet) */}
        {!results && !loading && (
          <div className="px-4 py-8 text-center text-sm text-neutral-400">
            Search messages, channels, and people
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-4 border-t border-neutral-100 px-4 py-2 text-[11px] text-neutral-400">
          <span><kbd className="mr-0.5 rounded bg-neutral-100 px-1 py-0.5 font-mono">↑↓</kbd>navigate</span>
          <span><kbd className="mr-0.5 rounded bg-neutral-100 px-1 py-0.5 font-mono">↵</kbd>open</span>
          <span><kbd className="mr-0.5 rounded bg-neutral-100 px-1 py-0.5 font-mono">esc</kbd>close</span>
          <span className="ml-auto"><kbd className="mr-0.5 rounded bg-neutral-100 px-1 py-0.5 font-mono">⌘K</kbd>search</span>
        </div>
      </div>
    </div>
  );
}
