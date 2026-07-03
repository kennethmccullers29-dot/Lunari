"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { clsx } from "clsx";
import type { SuggestionKeyDownProps } from "@tiptap/suggestion";

export type MentionItem = { id: string; label: string };

export interface MentionListRef {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

export const MentionList = forwardRef<
  MentionListRef,
  { items: MentionItem[]; command: (item: MentionItem) => void }
>(function MentionList({ items, command }, ref) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => setSelectedIndex(0), [items]);

  const selectItem = (index: number) => {
    const item = items[index];
    if (item) command(item);
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex((i) => (i + items.length - 1) % items.length);
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelectedIndex((i) => (i + 1) % items.length);
        return true;
      }
      if (event.key === "Enter") {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  if (!items.length) {
    return (
      <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg text-sm text-muted-foreground">
        No matches
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-popover shadow-lg overflow-hidden min-w-[180px]">
      {items.map((item, i) => (
        <button
          key={item.id}
          type="button"
          onClick={() => selectItem(i)}
          className={clsx(
            "flex w-full items-center gap-2 px-3 py-2 text-sm text-left transition-colors",
            i === selectedIndex
              ? "bg-[#611f69]/10 text-[#611f69]"
              : "text-foreground hover:bg-muted/50"
          )}
        >
          <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-bold uppercase text-muted-foreground">
            {item.label.charAt(0)}
          </span>
          <span className="font-medium">{item.label}</span>
        </button>
      ))}
    </div>
  );
});
