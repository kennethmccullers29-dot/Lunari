"use client";

import { useEffect, useRef } from "react";
import type { DailyParticipant } from "@daily-co/daily-js";
import { MicOff } from "lucide-react";

type Participant = DailyParticipant;

export function ParticipantTile({
  participant,
  isLocal,
}: {
  participant: Participant;
  isLocal: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const videoTrack = participant.tracks.video;
  const audioTrack = participant.tracks.audio;
  const screenVideoTrack = participant.tracks.screenVideo;

  const hasVideo =
    videoTrack?.state === "playable" || screenVideoTrack?.state === "playable";
  const hasAudio = audioTrack?.state === "playable";
  const isMuted = !audioTrack?.subscribed || audioTrack?.state !== "playable";

  const displayName = participant.user_name || (isLocal ? "You" : "Participant");
  const initial = displayName.trim().charAt(0).toUpperCase();

  // Prefer screen share over camera.
  const activeVideoTrack =
    screenVideoTrack?.state === "playable"
      ? screenVideoTrack.persistentTrack
      : videoTrack?.state === "playable"
      ? videoTrack.persistentTrack
      : null;

  useEffect(() => {
    if (!videoRef.current || !activeVideoTrack) return;
    videoRef.current.srcObject = new MediaStream([activeVideoTrack]);
  }, [activeVideoTrack]);

  useEffect(() => {
    if (!audioRef.current || isLocal || !audioTrack?.persistentTrack) return;
    if (hasAudio) {
      audioRef.current.srcObject = new MediaStream([audioTrack.persistentTrack]);
    }
  }, [audioTrack?.persistentTrack, hasAudio, isLocal]);

  return (
    <div className="relative aspect-video overflow-hidden rounded-xl bg-neutral-900">
      {hasVideo && activeVideoTrack ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="h-full w-full object-cover"
          style={{ transform: isLocal ? "scaleX(-1)" : "none" }}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-neutral-700 text-2xl font-bold text-white">
            {initial}
          </span>
        </div>
      )}

      {!isLocal && <audio ref={audioRef} autoPlay playsInline />}

      <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
        {isMuted && <MicOff className="size-3.5 text-red-400" />}
        <span className="rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">
          {isLocal ? `${displayName} (you)` : displayName}
        </span>
      </div>
    </div>
  );
}
