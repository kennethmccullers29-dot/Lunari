"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import DailyIframe, { type DailyCall, type DailyParticipantsObject } from "@daily-co/daily-js";
import { ParticipantTile } from "@/components/video/participant-tile";
import { CallControls } from "@/components/video/call-controls";
import { useVoicePresence, type VoiceParticipant } from "@/lib/hooks/use-voice-presence";
import { Loader2 } from "lucide-react";

type ParticipantMap = DailyParticipantsObject;

type CallState = "loading" | "joined" | "error";

export function CallView({
  channelId,
  workspaceId,
  channelName,
  currentUser,
}: {
  channelId: string;
  workspaceId: string;
  channelName: string;
  currentUser: VoiceParticipant;
}) {
  const router = useRouter();
  const callRef = useRef<DailyCall | null>(null);

  const [state, setState] = useState<CallState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<ParticipantMap>({} as ParticipantMap);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Track presence so the sidebar can show who's in this call.
  useVoicePresence(channelId, currentUser);

  const syncParticipants = useCallback((call: DailyCall) => {
    setParticipants({ ...call.participants() });
  }, []);

  useEffect(() => {
    let active = true;

    async function join() {
      try {
        // Destroy any orphaned Daily instance from a previous mount (e.g.
        // React Strict Mode double-invoke, or navigating away mid-call and
        // back). DailyIframe.getCallInstance() returns the singleton if one
        // was left behind without being destroyed.
        const orphan = DailyIframe.getCallInstance();
        if (orphan) {
          await orphan.leave().catch(() => {});
          await orphan.destroy().catch(() => {});
        }

        if (!active) return;

        const res = await fetch("/api/video/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channelId }),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error ?? "Failed to get room");

        if (!active) return;

        const call = DailyIframe.createCallObject({ audioSource: true, videoSource: true });
        callRef.current = call;

        call.on("joined-meeting", () => {
          if (!active) return;
          setState("joined");
          syncParticipants(call);
        });
        call.on("participant-joined", () => { if (active) syncParticipants(call); });
        call.on("participant-updated", () => { if (active) syncParticipants(call); });
        call.on("participant-left", () => { if (active) syncParticipants(call); });
        call.on("track-started", () => { if (active) syncParticipants(call); });
        call.on("track-stopped", () => { if (active) syncParticipants(call); });
        call.on("local-screen-share-started", () => {
          if (!active) return;
          setIsScreenSharing(true);
          syncParticipants(call);
        });
        call.on("local-screen-share-stopped", () => {
          if (!active) return;
          setIsScreenSharing(false);
          syncParticipants(call);
        });
        call.on("error", (e) => {
          if (!active) return;
          setError(e?.errorMsg ?? "Call error");
          setState("error");
        });

        await call.join({ url: data.roomUrl, token: data.token });
      } catch (err) {
        if (!active) return;
        const msg = err instanceof Error ? err.message : "Could not join call";
        setError(msg);
        setState("error");
      }
    }

    join();

    return () => {
      active = false;
      // Capture ref before nulling so the destroy actually runs on the right instance.
      const call = callRef.current;
      callRef.current = null;
      if (call) {
        call.leave().catch(() => {}).finally(() => call.destroy().catch(() => {}));
      }
    };
  }, [channelId, syncParticipants]);

  const handleLeave = useCallback(async () => {
    await callRef.current?.leave();
    callRef.current?.destroy();
    callRef.current = null;
    router.push(`/w/${workspaceId}`);
  }, [router, workspaceId]);

  const handleToggleMute = useCallback(() => {
    const call = callRef.current;
    if (!call) return;
    call.setLocalAudio(isMuted);
    setIsMuted((m) => !m);
  }, [isMuted]);

  const handleToggleVideo = useCallback(() => {
    const call = callRef.current;
    if (!call) return;
    call.setLocalVideo(isVideoOff);
    setIsVideoOff((v) => !v);
  }, [isVideoOff]);

  const handleToggleScreenShare = useCallback(async () => {
    const call = callRef.current;
    if (!call) return;
    if (isScreenSharing) {
      await call.stopScreenShare();
    } else {
      await call.startScreenShare();
    }
  }, [isScreenSharing]);

  const participantList = Object.values(participants);
  const localParticipant = participantList.find((p) => p.local);
  const remoteParticipants = participantList.filter((p) => !p.local);
  const orderedParticipants = localParticipant
    ? [localParticipant, ...remoteParticipants]
    : remoteParticipants;

  const gridCols =
    orderedParticipants.length === 1
      ? "grid-cols-1 max-w-2xl"
      : orderedParticipants.length === 2
      ? "grid-cols-2 max-w-4xl"
      : orderedParticipants.length <= 4
      ? "grid-cols-2"
      : "grid-cols-3";

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-neutral-950">
      <div className="border-b border-white/10 px-6 py-3">
        <p className="text-sm font-medium text-white/80">
          🎙 {channelName}
          {state === "joined" && (
            <span className="ml-2 text-white/40">
              {orderedParticipants.length} participant{orderedParticipants.length !== 1 ? "s" : ""}
            </span>
          )}
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-6">
        {state === "loading" && (
          <div className="flex flex-col items-center gap-3 text-white/60">
            <Loader2 className="size-8 animate-spin" />
            <p className="text-sm">Joining voice channel…</p>
          </div>
        )}

        {state === "error" && (
          <div className="max-w-sm rounded-xl bg-red-950/50 p-6 text-center ring-1 ring-red-800/50">
            <p className="font-medium text-red-300">Could not join call</p>
            <p className="mt-1 text-sm text-red-400/80">{error}</p>
            {error?.includes("DAILY_API_KEY") && (
              <p className="mt-3 text-xs text-red-400/60">
                Add DAILY_API_KEY to .env.local and restart the dev server.
              </p>
            )}
            <button
              type="button"
              onClick={() => router.push(`/w/${workspaceId}`)}
              className="mt-4 rounded-lg bg-red-800/60 px-4 py-2 text-sm text-white hover:bg-red-700/60"
            >
              Go back
            </button>
          </div>
        )}

        {state === "joined" && (
          <div className={`mx-auto grid w-full gap-3 ${gridCols}`}>
            {orderedParticipants.map((p) => (
              <ParticipantTile key={p.session_id} participant={p} isLocal={p.local} />
            ))}
          </div>
        )}
      </div>

      {state === "joined" && (
        <div className="flex shrink-0 justify-center p-4">
          <CallControls
            isMuted={isMuted}
            isVideoOff={isVideoOff}
            isScreenSharing={isScreenSharing}
            onToggleMute={handleToggleMute}
            onToggleVideo={handleToggleVideo}
            onToggleScreenShare={handleToggleScreenShare}
            onLeave={handleLeave}
          />
        </div>
      )}
    </div>
  );
}
