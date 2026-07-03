"use client";

import { useState } from "react";
import { EMOJIS, EMOJI_CATEGORIES } from "@/lib/data/emoji";

export function EmojiPicker({
  onSelect,
}: {
  onSelect: (emoji: string) => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? EMOJIS.filter((e) => e.name.includes(query.trim().toLowerCase()))
    : EMOJIS;

  const categories = query.trim() ? ["Results"] : EMOJI_CATEGORIES;

  return (
    <div className="flex max-h-80 w-[min(16rem,calc(100vw-2rem))] flex-col">
      <div className="border-b border-border p-2">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search emoji…"
          className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground outline-none focus:border-[#611f69]"
        />
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {categories.map((category) => {
          const items = filtered.filter((e) => query.trim() || e.category === category);
          if (items.length === 0) return null;
          return (
            <div key={category} className="mb-2">
              <h4 className="mb-1 px-1 text-[11px] font-semibold uppercase text-muted-foreground">
                {category}
              </h4>
              <div className="grid grid-cols-8 gap-0.5">
                {items.map((item) => (
                  <button
                    key={item.emoji}
                    type="button"
                    title={item.name}
                    onClick={() => onSelect(item.emoji)}
                    className="flex h-7 w-7 items-center justify-center rounded text-lg hover:bg-muted"
                  >
                    {item.emoji}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="px-1 py-2 text-sm text-muted-foreground">No emoji found</p>
        )}
      </div>
    </div>
  );
}
