"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/optics/avatar";
import { X } from "lucide-react";
import type { Profile } from "@/lib/types/database";

export function UserProfilePanel({
  userId,
  onClose,
}: {
  userId: string;
  onClose: () => void;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single()
      .then(({ data }) => {
        setProfile(data);
        setLoading(false);
      });
  }, [userId]);

  const statusColors: Record<string, string> = {
    active: "bg-green-500",
    away: "bg-yellow-400",
    offline: "bg-muted-foreground/40",
  };

  const statusLabels: Record<string, string> = {
    active: "Active",
    away: "Away",
    offline: "Offline",
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col border-border bg-background md:relative md:inset-auto md:h-full md:w-72 md:border-l">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <span className="text-sm font-semibold text-foreground">Profile</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close profile"
        >
          <X className="size-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      ) : !profile ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Profile not found
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col items-center gap-3 px-6 py-6">
            <div className="relative">
              <Avatar size="lg" className="size-20">
                {profile.avatar_url && (
                  <AvatarImage src={profile.avatar_url} width={80} height={80} alt="" />
                )}
                <AvatarFallback className="bg-black text-xl text-white font-bold uppercase">
                  {profile.display_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span
                className={`absolute bottom-0.5 right-0.5 size-3.5 rounded-full border-2 border-background ${
                  statusColors[profile.status] ?? "bg-muted-foreground/40"
                }`}
              />
            </div>

            <div className="text-center">
              <h2 className="text-lg font-bold text-foreground">{profile.display_name}</h2>
              {profile.full_name && (
                <p className="text-sm text-muted-foreground">{profile.full_name}</p>
              )}
            </div>
          </div>

          <div className="space-y-4 px-6 pb-6">
            <div className="flex items-center gap-2.5">
              <span
                className={`size-2.5 rounded-full ${statusColors[profile.status] ?? "bg-muted-foreground/40"}`}
              />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Status</p>
                <p className="text-sm text-foreground">
                  {profile.status_emoji && (
                    <span className="mr-1">{profile.status_emoji}</span>
                  )}
                  {profile.status_text || statusLabels[profile.status] || "No status"}
                </p>
              </div>
            </div>

            {profile.title && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Title</p>
                <p className="text-sm text-foreground">{profile.title}</p>
              </div>
            )}

            {profile.pronouns && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Pronouns</p>
                <p className="text-sm text-foreground">{profile.pronouns}</p>
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-muted-foreground">Member since</p>
              <p className="text-sm text-foreground">
                {new Date(profile.created_at).toLocaleDateString([], {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
