"use client";

import { useState } from "react";
import { Copy, Check, RefreshCw, Mail, Link2 } from "lucide-react";
import {
  Dialog,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/optics/dialog";
import { Input } from "@/components/optics/input";
import { Button } from "@/components/optics/button";
import { regenerateJoinCode, sendWorkspaceInvite } from "@/lib/actions/workspaces";

export function InviteModal({
  workspaceId,
  workspaceName,
  initialJoinCode,
  isOwnerOrAdmin,
  onClose,
}: {
  workspaceId: string;
  workspaceName: string;
  initialJoinCode: string;
  isOwnerOrAdmin: boolean;
  onClose: () => void;
}) {
  const [joinCode, setJoinCode] = useState(initialJoinCode);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState<"idle" | "sent" | "error">("idle");
  const [emailError, setEmailError] = useState<string | null>(null);

  const inviteUrl = `${window.location.origin}/join/${joinCode}`;

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 1500);
  };

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(joinCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1500);
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    setRegenError(null);
    const result = await regenerateJoinCode(workspaceId);
    setRegenerating(false);
    if ("error" in result) {
      setRegenError(result.error);
    } else {
      setJoinCode(result.joinCode);
    }
  };

  const handleSendEmail = async () => {
    if (!email.trim()) return;
    setSending(true);
    setEmailStatus("idle");
    setEmailError(null);
    const result = await sendWorkspaceInvite(workspaceId, email.trim());
    setSending(false);
    if (result.error) {
      setEmailStatus("error");
      setEmailError(result.error);
    } else {
      setEmailStatus("sent");
      setEmail("");
    }
  };

  return (
    <Dialog open onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogPopup className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite people to {workspaceName}</DialogTitle>
          <DialogDescription>
            Share a link or send a direct email invite.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Invite link */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Link2 className="size-3.5" />
              Invite link
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg border bg-muted/40 px-3 py-2 text-xs font-mono">
                {inviteUrl}
              </code>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                onClick={handleCopyLink}
                aria-label="Copy invite link"
              >
                {copiedLink ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              </Button>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                Code:
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="flex items-center gap-1 font-mono font-medium text-foreground hover:underline"
                >
                  {joinCode}
                  {copiedCode ? <Check className="size-3" /> : <Copy className="size-3" />}
                </button>
              </div>

              {isOwnerOrAdmin && (
                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  <RefreshCw className={`size-3 ${regenerating ? "animate-spin" : ""}`} />
                  Regenerate
                </button>
              )}
            </div>
            {regenError && <p className="text-xs text-destructive">{regenError}</p>}
          </div>

          {/* Email invite — owner/admin only */}
          {isOwnerOrAdmin && (
            <div className="space-y-1.5 border-t pt-4">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Mail className="size-3.5" />
                Invite by email
              </div>
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setEmail(e.target.value);
                    if (emailStatus !== "idle") setEmailStatus("idle");
                  }}
                  placeholder="teammate@example.com"
                  className="flex-1"
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === "Enter") { e.preventDefault(); handleSendEmail(); }
                  }}
                />
                <Button
                  type="button"
                  onClick={handleSendEmail}
                  disabled={sending || !email.trim()}
                >
                  {sending ? "Sending…" : "Send"}
                </Button>
              </div>
              {emailStatus === "sent" && (
                <p className="flex items-center gap-1 text-xs text-green-600">
                  <Check className="size-3" /> Invite sent!
                </p>
              )}
              {emailStatus === "error" && (
                <p className="text-xs text-destructive">{emailError}</p>
              )}
            </div>
          )}
        </div>
      </DialogPopup>
    </Dialog>
  );
}
