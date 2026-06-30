"use client";

// Live sidebar counts require a shared VoicePresenceProvider context (since
// createBrowserClient is a singleton — two hooks subscribing to the same
// Supabase channel topic conflict). Stubbed for now; the call page's
// useVoicePresence hook still tracks participants correctly for the call view.
export function useVoiceChannelCounts(_channelIds: string[]): Record<string, number> {
  return {};
}
