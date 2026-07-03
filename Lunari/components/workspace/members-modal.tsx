"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/optics/avatar";
import { changeMemberRole, removeMember } from "@/lib/actions/moderation";
import type { WorkspaceRole } from "@/lib/types/database";

type ModalMember = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  role: WorkspaceRole;
  title: string | null;
};

function RoleBadge({ role }: { role: WorkspaceRole }) {
  const styles: Record<WorkspaceRole, string> = {
    owner: "bg-yellow-100 text-yellow-700",
    admin: "bg-blue-100 text-blue-700",
    member: "bg-neutral-100 text-neutral-500",
  };
  return (
    <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold capitalize ${styles[role]}`}>
      {role}
    </span>
  );
}

export function MembersModal({
  workspaceId,
  members,
  currentUserId,
  currentUserRole,
  onClose,
}: {
  workspaceId: string;
  members: ModalMember[];
  currentUserId: string;
  currentUserRole: WorkspaceRole;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isOwner = currentUserRole === "owner";
  const isAdminOrOwner = isOwner || currentUserRole === "admin";

  const handleRoleChange = (userId: string, newRole: "admin" | "member") => {
    setError(null);
    startTransition(async () => {
      try {
        await changeMemberRole(workspaceId, userId, newRole);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to change role");
      }
    });
  };

  const handleRemove = (userId: string) => {
    setError(null);
    startTransition(async () => {
      try {
        await removeMember(workspaceId, userId);
        setConfirmRemoveId(null);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to remove member");
        setConfirmRemoveId(null);
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <h2 className="text-base font-semibold text-neutral-900">
            Members · {members.length}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {error && (
          <div className="mx-4 mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="max-h-[60vh] divide-y divide-neutral-50 overflow-y-auto">
          {members.map((m) => {
            const canActOn =
              isAdminOrOwner && m.id !== currentUserId && m.role !== "owner";
            const canPromote = isOwner && m.role === "member";
            const canDemote = isOwner && m.role === "admin";
            // Admins can only kick regular members, not other admins
            const canKick =
              isAdminOrOwner && (isOwner || m.role === "member");
            const isConfirmingRemove = confirmRemoveId === m.id;

            return (
              <div key={m.id} className="px-5 py-3">
                <div className="flex items-center gap-3">
                  <Avatar size="sm" className="size-8 shrink-0">
                    {m.avatar_url && (
                      <AvatarImage src={m.avatar_url} width={32} height={32} alt="" />
                    )}
                    <AvatarFallback className="bg-black text-xs font-bold uppercase text-white">
                      {m.display_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-neutral-900">
                        {m.display_name}
                      </span>
                      {m.id === currentUserId && (
                        <span className="text-xs text-neutral-400">(you)</span>
                      )}
                      <RoleBadge role={m.role} />
                    </div>
                    {m.title && (
                      <p className="truncate text-xs text-neutral-400">{m.title}</p>
                    )}
                  </div>

                  {canActOn && !isConfirmingRemove && (
                    <div className="flex shrink-0 items-center gap-1">
                      {canPromote && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleRoleChange(m.id, "admin")}
                          className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                        >
                          Make admin
                        </button>
                      )}
                      {canDemote && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleRoleChange(m.id, "member")}
                          className="rounded px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-50"
                        >
                          Demote
                        </button>
                      )}
                      {canKick && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => setConfirmRemoveId(m.id)}
                          className="rounded px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50 disabled:opacity-50"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {isConfirmingRemove && (
                  <div className="mt-2 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs">
                    <span className="text-red-700">
                      Remove {m.display_name} from workspace?
                    </span>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleRemove(m.id)}
                      className="font-semibold text-red-600 underline hover:text-red-800 disabled:opacity-50"
                    >
                      Remove
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmRemoveId(null)}
                      className="text-neutral-500 hover:text-neutral-700"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="border-t border-neutral-100 px-5 py-3 text-xs text-neutral-400">
          {isOwner
            ? "As owner, you can manage all member roles."
            : "As admin, you can remove regular members."}
        </div>
      </div>
    </div>
  );
}
