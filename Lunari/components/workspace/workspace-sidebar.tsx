"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/actions/auth";
import { CreateChannelModal } from "@/components/channel/create-channel-modal";
import { StartDmModal } from "@/components/dm/start-dm-modal";
import { StatusDot } from "@/components/presence/status-dot";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/optics/avatar";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { EditProfileModal } from "@/components/profile/edit-profile-modal";
import { GettingStartedChecklist } from "@/components/onboarding/getting-started-checklist";
import { InviteModal } from "@/components/invite/invite-modal";
import { usePresenceStatus } from "@/lib/hooks/use-presence-status";
import { useVoiceChannelCounts } from "@/lib/hooks/use-voice-channel-counts";
import { useWorkspaceActivity } from "@/components/workspace/workspace-activity-provider";
import type { ProfileStatus } from "@/lib/types/database";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/optics/dropdown-menu";
import { CalendarDays, Command, Hash, LayoutDashboard, Lock, Mic, Plus, UserPlus } from "lucide-react";
import { IconDotsVertical, IconLogout, IconUserCircle } from "@tabler/icons-react";

function formatProfileTooltip(m: {
  full_name: string | null;
  display_name: string;
  pronouns: string | null;
  title: string | null;
}): string {
  const parts = [m.full_name || m.display_name];
  if (m.pronouns) parts.push(m.pronouns);
  if (m.title) parts.push(m.title);
  return parts.join(" · ");
}

type Member = {
  id: string;
  display_name: string;
  status: ProfileStatus;
  avatar_url: string | null;
  full_name: string | null;
  title: string | null;
  pronouns: string | null;
  status_emoji: string | null;
  status_text: string | null;
};
type ChannelItem = { id: string; name: string; is_private: boolean; type: "text" | "voice" };
type DmItem = { id: string; label: string };

export function WorkspaceSidebar({
  workspaceId,
  workspaceName,
  joinCode,
  channels,
  dms,
  members,
  currentUser,
  currentUserEmail,
  hasSentMessage,
  currentUserRole,
}: {
  workspaceId: string;
  workspaceName: string;
  joinCode: string;
  channels: ChannelItem[];
  dms: DmItem[];
  members: Member[];
  currentUser: Member;
  currentUserEmail: string;
  hasSentMessage: boolean;
  currentUserRole: "owner" | "admin" | "member";
}) {
  const pathname = usePathname();
  const [modal, setModal] = useState<"channel" | "dm" | null>(null);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [liveJoinCode] = useState(joinCode);
  const isOwnerOrAdmin = currentUserRole === "owner" || currentUserRole === "admin";
  const statuses = usePresenceStatus(currentUser.id, members);
  const otherMembers = members.filter((m) => m.id !== currentUser.id);
  const { unreadByTarget } = useWorkspaceActivity();
  const textChannels = channels.filter((c) => c.type === "text");
  const voiceChannels = channels.filter((c) => c.type === "voice");
  const voiceCounts = useVoiceChannelCounts(voiceChannels.map((c) => c.id));

  const profileComplete = !!(currentUser.avatar_url || currentUser.full_name);
  const checklistItems = [
    {
      key: "profile",
      label: "Complete your profile",
      done: profileComplete,
      onClick: () => setEditProfileOpen(true),
    },
    {
      key: "channel",
      label: "Create a channel",
      done: channels.length > 0,
      onClick: () => setModal("channel"),
    },
    {
      key: "teammate",
      label: "Invite a teammate",
      done: members.length > 1,
      onClick: () => {
        navigator.clipboard.writeText(joinCode);
      },
    },
    {
      key: "message",
      label: "Send your first message",
      done: hasSentMessage,
    },
  ];

  return (
    <>
      <Sidebar className="data-[side=left]:left-[calc(var(--sidebar-width-icon)+16px)]">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem className="flex items-center gap-1">
              <SidebarMenuButton size="lg" asChild>
                <Link href={`/w/${workspaceId}`}>
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <Command className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{workspaceName}</span>
                    <span className="truncate text-xs text-muted-foreground">Workspace</span>
                  </div>
                </Link>
              </SidebarMenuButton>
              <button
                type="button"
                aria-label="Invite people"
                title="Invite people"
                onClick={() => setInviteOpen(true)}
                className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              >
                <UserPlus className="size-4" />
              </button>
              <NotificationBell workspaceId={workspaceId} currentUserId={currentUser.id} />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <GettingStartedChecklist workspaceId={workspaceId} items={checklistItems} />

          <SidebarGroup>
            <SidebarGroupLabel>Tools</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === `/w/${workspaceId}/boards`}>
                  <Link href={`/w/${workspaceId}/boards`}>
                    <LayoutDashboard />
                    <span>Boards</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === `/w/${workspaceId}/calendar`}>
                  <Link href={`/w/${workspaceId}/calendar`}>
                    <CalendarDays />
                    <span>Calendar</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Channels</SidebarGroupLabel>
            <SidebarGroupAction onClick={() => setModal("channel")}>
              <Plus />
              <span className="sr-only">Add channel</span>
            </SidebarGroupAction>
            <SidebarMenu>
              {textChannels.map((c) => {
                const href = `/w/${workspaceId}/c/${c.id}`;
                const unread = unreadByTarget[`channel:${c.id}`] ?? 0;
                return (
                  <SidebarMenuItem key={c.id}>
                    <SidebarMenuButton asChild isActive={pathname === href}>
                      <Link href={href}>
                        {c.is_private ? <Lock /> : <Hash />}
                        <span className="truncate">{c.name}</span>
                        {unread > 0 && <UnreadBadge count={unread} />}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              {textChannels.length === 0 && (
                <EmptyHint actionLabel="Create one" onAction={() => setModal("channel")}>
                  No text channels yet
                </EmptyHint>
              )}
            </SidebarMenu>
          </SidebarGroup>

          {voiceChannels.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel>Voice</SidebarGroupLabel>
              <SidebarMenu>
                {voiceChannels.map((c) => {
                  const href = `/w/${workspaceId}/voice/${c.id}`;
                  const count = voiceCounts[c.id] ?? 0;
                  return (
                    <SidebarMenuItem key={c.id}>
                      <SidebarMenuButton asChild isActive={pathname === href}>
                        <Link href={href}>
                          <Mic />
                          <span className="truncate">{c.name}</span>
                          {count > 0 && (
                            <span className="ml-auto text-xs font-medium text-green-400">
                              {count}
                            </span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          )}

          <SidebarGroup>
            <SidebarGroupLabel>Direct messages</SidebarGroupLabel>
            <SidebarGroupAction onClick={() => setModal("dm")}>
              <Plus />
              <span className="sr-only">Add direct message</span>
            </SidebarGroupAction>
            <SidebarMenu>
              {dms.map((d) => {
                const href = `/w/${workspaceId}/dm/${d.id}`;
                const unread = unreadByTarget[`dm:${d.id}`] ?? 0;
                return (
                  <SidebarMenuItem key={d.id}>
                    <SidebarMenuButton asChild isActive={pathname === href}>
                      <Link href={href}>
                        <span className="truncate">{d.label}</span>
                        {unread > 0 && <UnreadBadge count={unread} />}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              {dms.length === 0 && (
                <EmptyHint actionLabel="Start one" onAction={() => setModal("dm")}>
                  No conversations yet
                </EmptyHint>
              )}
            </SidebarMenu>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Members</SidebarGroupLabel>
            <SidebarMenu>
              {members.map((m) => (
                <SidebarMenuItem key={m.id}>
                  <SidebarMenuButton className="cursor-default hover:bg-transparent">
                    <Avatar size="sm" title={formatProfileTooltip(m)}>
                      {m.avatar_url && <AvatarImage src={m.avatar_url} width={24} height={24} alt="" />}
                      <AvatarFallback className="bg-black text-white font-bold uppercase">
                        {m.display_name.trim().charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <StatusDot status={statuses[m.id] ?? m.status} />
                    <span className="truncate">{m.display_name}</span>
                    {m.status_emoji && <span>{m.status_emoji}</span>}
                    {m.id === currentUser.id && (
                      <span className="text-xs text-muted-foreground">(you)</span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <SidebarMenuButton size="lg">
                      <Avatar>
                        {currentUser.avatar_url && (
                          <AvatarImage src={currentUser.avatar_url} width={32} height={32} alt="" />
                        )}
                        <AvatarFallback className="bg-black text-white font-bold uppercase">
                          {currentUser.display_name.trim().charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-medium">{currentUser.display_name}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {currentUser.status_text
                            ? `${currentUser.status_emoji ?? ""} ${currentUser.status_text}`.trim()
                            : currentUserEmail}
                        </span>
                      </div>
                      <IconDotsVertical className="ml-auto size-4" />
                    </SidebarMenuButton>
                  }
                />
                <DropdownMenuContent
                  side="top"
                  align="end"
                  className="w-(--anchor-width) min-w-56"
                >
                  <DropdownMenuItem onClick={() => setEditProfileOpen(true)}>
                    <IconUserCircle className="size-4" />
                    Edit profile
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    render={
                      <form action={signOut} className="w-full">
                        <button type="submit" className="flex w-full items-center gap-1.5">
                          <IconLogout className="size-4" />
                          Log out
                        </button>
                      </form>
                    }
                  />
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      {modal === "channel" && (
        <CreateChannelModal
          workspaceId={workspaceId}
          members={otherMembers}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "dm" && (
        <StartDmModal
          workspaceId={workspaceId}
          members={otherMembers}
          onClose={() => setModal(null)}
        />
      )}
      {editProfileOpen && (
        <EditProfileModal profile={currentUser} onClose={() => setEditProfileOpen(false)} />
      )}
      {inviteOpen && (
        <InviteModal
          workspaceId={workspaceId}
          workspaceName={workspaceName}
          initialJoinCode={liveJoinCode}
          isOwnerOrAdmin={isOwnerOrAdmin}
          onClose={() => setInviteOpen(false)}
        />
      )}
    </>
  );
}

function EmptyHint({
  children,
  actionLabel,
  onAction,
}: {
  children: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <SidebarMenuItem>
      <div className="flex items-center justify-between gap-2 px-2 py-1">
        <span className="text-xs text-muted-foreground">{children}</span>
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="shrink-0 text-xs font-medium text-primary hover:underline"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </SidebarMenuItem>
  );
}

function UnreadBadge({ count }: { count: number }) {
  return (
    <span className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[0.625rem] font-semibold text-primary-foreground">
      {count > 99 ? "99+" : count}
    </span>
  );
}
