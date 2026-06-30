"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogPopup, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/optics/dialog";
import { Input } from "@/components/optics/input";
import { Label } from "@/components/optics/label";
import { Button } from "@/components/optics/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/optics/avatar";
import { EmojiButton } from "@/components/emoji/emoji-button";
import { uploadAvatar } from "@/lib/storage";
import { updateProfile } from "@/lib/actions/profile";
import { X } from "lucide-react";

type EditableProfile = {
  id: string;
  display_name: string;
  full_name: string | null;
  title: string | null;
  pronouns: string | null;
  status_emoji: string | null;
  status_text: string | null;
  avatar_url: string | null;
};

export function EditProfileModal({
  profile,
  onClose,
}: {
  profile: EditableProfile;
  onClose: () => void;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(profile.display_name);
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [title, setTitle] = useState(profile.title ?? "");
  const [pronouns, setPronouns] = useState(profile.pronouns ?? "");
  const [statusEmoji, setStatusEmoji] = useState(profile.status_emoji ?? "");
  const [statusText, setStatusText] = useState(profile.status_text ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const url = await uploadAvatar(file);
      setAvatarUrl(url);
    } catch {
      setError("Could not upload photo");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError("Display name is required");
      return;
    }

    setSaving(true);
    setError(null);

    const formData = new FormData();
    formData.set("display_name", displayName);
    formData.set("full_name", fullName);
    formData.set("title", title);
    formData.set("pronouns", pronouns);
    formData.set("status_emoji", statusEmoji);
    formData.set("status_text", statusText);
    formData.set("avatar_url", avatarUrl);

    const result = await updateProfile(formData);
    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.refresh();
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>This is how you&apos;ll appear across your workspaces.</DialogDescription>
        </DialogHeader>

        <form id="edit-profile-form" onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex items-center gap-4">
            <button
              type="button"
              className="relative shrink-0"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Change photo"
            >
              <Avatar size="lg" className="size-16">
                {avatarUrl && <AvatarImage src={avatarUrl} width={64} height={64} alt="" />}
                <AvatarFallback className="bg-black text-base text-white font-bold uppercase">
                  {displayName.trim().charAt(0)}
                </AvatarFallback>
              </Avatar>
              {uploading && (
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-[0.625rem] text-white">
                  …
                </span>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="flex flex-col gap-1">
              <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                Upload photo
              </Button>
              {avatarUrl && (
                <button
                  type="button"
                  className="text-left text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setAvatarUrl("")}
                >
                  Remove photo
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-sm font-medium">Display name</Label>
            <Input
              className="col-span-3"
              value={displayName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDisplayName(e.target.value)}
              required
              placeholder="e.g. jane"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-sm font-medium">Full name</Label>
            <Input
              className="col-span-3"
              value={fullName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
              placeholder="e.g. Jane Doe"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-sm font-medium">Title</Label>
            <Input
              className="col-span-3"
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
              placeholder="e.g. Senior Engineer"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-sm font-medium">Pronouns</Label>
            <Input
              className="col-span-3"
              value={pronouns}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPronouns(e.target.value)}
              placeholder="e.g. she/her"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-sm font-medium">Status</Label>
            <div className="col-span-3 flex items-center gap-1">
              <EmojiButton
                onSelect={(emoji) => setStatusEmoji(emoji)}
                label="Choose status emoji"
                className="shrink-0 text-lg"
              />
              <span className="w-5 shrink-0 text-center text-lg">{statusEmoji}</span>
              <Input
                value={statusText}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStatusText(e.target.value)}
                placeholder="What's your status?"
              />
              {(statusEmoji || statusText) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Clear status"
                  onClick={() => {
                    setStatusEmoji("");
                    setStatusText("");
                  }}
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="edit-profile-form" disabled={saving || uploading}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
