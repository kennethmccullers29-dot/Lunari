"use client";

import { Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, PhoneOff } from "lucide-react";

export function CallControls({
  isMuted,
  isVideoOff,
  isScreenSharing,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onLeave,
}: {
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onLeave: () => void;
}) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-2xl bg-neutral-900/90 px-6 py-3 shadow-xl backdrop-blur-sm ring-1 ring-white/10">
      <ControlButton
        onClick={onToggleMute}
        label={isMuted ? "Unmute" : "Mute"}
        active={isMuted}
        danger={isMuted}
      >
        {isMuted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
      </ControlButton>

      <ControlButton
        onClick={onToggleVideo}
        label={isVideoOff ? "Start video" : "Stop video"}
        active={isVideoOff}
        danger={isVideoOff}
      >
        {isVideoOff ? <VideoOff className="size-5" /> : <Video className="size-5" />}
      </ControlButton>

      <ControlButton
        onClick={onToggleScreenShare}
        label={isScreenSharing ? "Stop sharing" : "Share screen"}
        active={isScreenSharing}
      >
        {isScreenSharing ? <MonitorOff className="size-5" /> : <Monitor className="size-5" />}
      </ControlButton>

      <div className="mx-2 h-6 w-px bg-white/20" />

      <ControlButton onClick={onLeave} label="Leave call" danger>
        <PhoneOff className="size-5" />
      </ControlButton>
    </div>
  );
}

function ControlButton({
  onClick,
  label,
  active,
  danger,
  children,
}: {
  onClick: () => void;
  label: string;
  active?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={[
        "flex size-11 items-center justify-center rounded-full transition-all duration-150",
        danger && active
          ? "bg-red-600 text-white hover:bg-red-500"
          : danger && !active
          ? "bg-neutral-700 text-white hover:bg-red-600"
          : active
          ? "bg-primary/30 text-primary ring-1 ring-primary/50"
          : "bg-neutral-700 text-white hover:bg-neutral-600",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </button>
  );
}
