"use client";

import Link from "next/link";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/optics/tooltip";
import { Separator } from "@/components/optics/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { getWorkspaceGradient } from "@/lib/workspace-color";
import { useWorkspaceActivity } from "@/components/workspace/workspace-activity-provider";

type WorkspaceItem = { id: string; name: string };

export function WorkspaceSwitcher({
  workspaces,
  currentWorkspaceId,
}: {
  workspaces: WorkspaceItem[];
  currentWorkspaceId: string;
}) {
  const { unreadByWorkspace } = useWorkspaceActivity();

  return (
    <Sidebar collapsible="none" className="w-[calc(var(--sidebar-width-icon)+16px)]! border-r">
      <SidebarContent>
        <SidebarGroup className="p-0">
          <SidebarGroupContent className="flex flex-col items-center px-0 py-2">
            <SidebarMenu className="flex flex-col items-center gap-3">
              {workspaces.map((w) => {
                const active = w.id === currentWorkspaceId;
                const unread = unreadByWorkspace[w.id] ?? 0;
                return (
                  <SidebarMenuItem
                    key={w.id}
                    className="group flex w-full items-center justify-center"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "absolute left-1 top-1/2 w-1 -translate-y-1/2 rounded-full bg-foreground transition-all duration-200",
                        active
                          ? "h-6 opacity-100"
                          : "h-2 opacity-0 group-hover:h-4 group-hover:opacity-70"
                      )}
                    />
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Link
                            href={`/w/${w.id}`}
                            className={cn(
                              "relative flex size-10 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white uppercase shadow-md shadow-black/30 inset-shadow-2xs inset-shadow-white/30 transition-all duration-200 hover:rounded-2xl hover:brightness-110",
                              getWorkspaceGradient(w.id),
                              active && "rounded-2xl"
                            )}
                          >
                            {w.name.trim().charAt(0).toUpperCase() || "?"}
                            {unread > 0 && !active && (
                              <span
                                aria-hidden
                                className="absolute -bottom-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full bg-red-500 text-[0.5rem] font-bold text-white ring-2 ring-sidebar"
                              >
                                {unread > 9 ? "9+" : unread}
                              </span>
                            )}
                          </Link>
                        }
                      />
                      <TooltipContent side="right">{w.name}</TooltipContent>
                    </Tooltip>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>

            {workspaces.length > 0 && <Separator className="my-2 w-6" />}

            <Tooltip>
              <TooltipTrigger
                render={
                  <Link
                    href="/workspaces"
                    className="flex size-10 items-center justify-center rounded-full text-muted-foreground transition-all duration-200 hover:rounded-2xl hover:bg-muted hover:text-primary"
                  >
                    <Plus className="size-4" />
                  </Link>
                }
              />
              <TooltipContent side="right">Add or join a workspace</TooltipContent>
            </Tooltip>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
