"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/optics/button";
import { Input } from "@/components/optics/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/optics/avatar";
import { EmojiButton } from "@/components/emoji/emoji-button";
import { uploadAvatar } from "@/lib/storage";
import { updateProfile, completeOnboarding } from "@/lib/actions/profile";
import { X } from "lucide-react";

type Step = "profile" | "status" | "done";

export function FirstRunModal({
  initialName,
}: {
  initialName: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("profile");
  const [displayName, setDisplayName] = useState(initialName);
  const [fullName, setFullName] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [title, setTitle] = useState("");
  const [statusEmoji, setStatusEmoji] = useState("");
  const [statusText, setStatusText] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
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
      setAvatarUrl(await uploadAvatar(file));
    } catch {
      setError("Couldn't upload photo — try again");
    } finally {
      setUploading(false);
    }
  };

  const handleProfileNext = async () => {
    if (!displayName.trim()) { setError("Display name is required"); return; }
    setSaving(true);
    setError(null);
    const formData = new FormData();
    formData.set("display_name", displayName);
    formData.set("full_name", fullName);
    formData.set("title", title);
    formData.set("pronouns", pronouns);
    formData.set("status_emoji", "");
    formData.set("status_text", "");
    formData.set("avatar_url", avatarUrl);
    const result = await updateProfile(formData);
    setSaving(false);
    if (result.error) { setError(result.error); return; }
    setStep("status");
  };

  const handleStatusNext = async () => {
    setSaving(true);
    if (statusEmoji || statusText) {
      const formData = new FormData();
      formData.set("display_name", displayName);
      formData.set("full_name", fullName);
      formData.set("title", title);
      formData.set("pronouns", pronouns);
      formData.set("status_emoji", statusEmoji);
      formData.set("status_text", statusText);
      formData.set("avatar_url", avatarUrl);
      await updateProfile(formData);
    }
    setSaving(false);
    setStep("done");
  };

  const handleDone = async () => {
    await completeOnboarding();
    router.refresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-background p-8 shadow-2xl ring-1 ring-foreground/10">

        {/* Step indicators */}
        <div className="mb-6 flex items-center gap-2">
          {(["profile", "status", "done"] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                step === s || (i < ["profile", "status", "done"].indexOf(step))
                  ? "bg-primary"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Step: profile */}
        {step === "profile" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Welcome to Lunari 👋</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Let&apos;s set up your profile so teammates know who you are.
              </p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative shrink-0"
                aria-label="Upload photo"
              >
                <Avatar className="size-16">
                  {avatarUrl && <AvatarImage src={avatarUrl} width={64} height={64} alt="" />}
                  <AvatarFallback className="bg-black text-xl font-bold text-white uppercase">
                    {displayName.trim().charAt(0)}
                  </AvatarFallback>
                </Avatar>
                {uploading && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-xs text-white">
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
              <div className="space-y-1">
                <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                  Upload photo
                </Button>
                <p className="text-xs text-muted-foreground">JPG, PNG or GIF</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Display name</label>
                <Input
                  value={displayName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDisplayName(e.target.value)}
                  placeholder="How you appear in chats"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Full name</label>
                <Input
                  value={fullName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Pronouns</label>
                  <Input
                    value={pronouns}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPronouns(e.target.value)}
                    placeholder="she/her"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Title</label>
                  <Input
                    value={title}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                    placeholder="Designer"
                  />
                </div>
              </div>
            </div>

            <Button className="w-full" onClick={handleProfileNext} disabled={saving || uploading}>
              {saving ? "Saving…" : "Continue →"}
            </Button>
          </div>
        )}

        {/* Step: status */}
        {step === "status" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Set a status</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Let teammates know what you&apos;re up to. You can change this anytime.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <EmojiButton onSelect={setStatusEmoji} label="Choose emoji" />
              <span className="w-6 text-center text-xl">{statusEmoji}</span>
              <Input
                value={statusText}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStatusText(e.target.value)}
                placeholder="What are you working on?"
                className="flex-1"
              />
              {(statusEmoji || statusText) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Clear"
                  onClick={() => { setStatusEmoji(""); setStatusText(""); }}
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleStatusNext} disabled={saving}>
                Skip
              </Button>
              <Button className="flex-1" onClick={handleStatusNext} disabled={saving}>
                {saving ? "Saving…" : "Continue →"}
              </Button>
            </div>
          </div>
        )}

        {/* Step: done */}
        {step === "done" && (
          <div className="space-y-5 text-center">
            <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-primary/10 text-4xl">
              🎉
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">You&apos;re all set!</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Create a workspace to start collaborating, or join an existing one with a code.
              </p>
            </div>
            <Button className="w-full" onClick={handleDone}>
              Get started
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
