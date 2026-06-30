"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Circle, X } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export type ChecklistItem = {
  key: string;
  label: string;
  done: boolean;
  onClick?: () => void;
};

export function GettingStartedChecklist({
  workspaceId,
  items,
}: {
  workspaceId: string;
  items: ChecklistItem[];
}) {
  const storageKey = `lunari-checklist-dismissed-${workspaceId}`;
  const [dismissed, setDismissed] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setDismissed(localStorage.getItem(storageKey) === "1");
    setHydrated(true);
  }, [storageKey]);

  const allDone = items.every((i) => i.done);

  useEffect(() => {
    if (hydrated && allDone && localStorage.getItem(storageKey) !== "1") {
      localStorage.setItem(storageKey, "1");
      setDismissed(true);
    }
  }, [allDone, hydrated, storageKey]);

  if (!hydrated || dismissed || allDone) return null;

  const doneCount = items.filter((i) => i.done).length;

  const dismiss = () => {
    localStorage.setItem(storageKey, "1");
    setDismissed(true);
  };

  return (
    <SidebarGroup>
      <div className="flex items-center justify-between pr-1">
        <SidebarGroupLabel>
          Getting started ({doneCount}/{items.length})
        </SidebarGroupLabel>
        <button
          type="button"
          aria-label="Dismiss checklist"
          className="text-muted-foreground hover:text-foreground"
          onClick={dismiss}
        >
          <X className="size-3.5" />
        </button>
      </div>
      <SidebarMenu className="gap-0.5">
        {items.map((item) => (
          <SidebarMenuItem key={item.key}>
            <button
              type="button"
              onClick={item.onClick}
              disabled={!item.onClick || item.done}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs transition-colors ${
                item.done
                  ? "text-muted-foreground line-through"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              } ${item.onClick && !item.done ? "cursor-pointer" : "cursor-default"}`}
            >
              {item.done ? (
                <CheckCircle2 className="size-3.5 shrink-0 text-primary" />
              ) : (
                <Circle className="size-3.5 shrink-0 text-muted-foreground" />
              )}
              <span className="truncate">{item.label}</span>
            </button>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
