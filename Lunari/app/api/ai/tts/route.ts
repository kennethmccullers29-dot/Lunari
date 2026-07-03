import { NextRequest } from "next/server";

// Premade fallback — ElevenLabs "Aria", available on all tiers
const FALLBACK_VOICE_ID = "9BWtsMINqrJLrRacOk9x";

// Cached after first successful lookup so we pay the extra round-trip once per server instance
let resolvedVoiceId: string | null = null;

async function getVoiceId(apiKey: string): Promise<string> {
  if (resolvedVoiceId) return resolvedVoiceId;

  // Allow explicit override via env
  if (process.env.ELEVENLABS_VOICE_ID) {
    resolvedVoiceId = process.env.ELEVENLABS_VOICE_ID;
    return resolvedVoiceId;
  }

  try {
    const res = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": apiKey },
    });
    if (res.ok) {
      const { voices } = (await res.json()) as {
        voices: Array<{ voice_id: string; name: string; category: string }>;
      };
      // Prefer premade voices (not community/library), then anything available
      const premade =
        voices.find((v) => v.category === "premade") ?? voices[0];
      resolvedVoiceId = premade?.voice_id ?? FALLBACK_VOICE_ID;
    } else {
      resolvedVoiceId = FALLBACK_VOICE_ID;
    }
  } catch {
    resolvedVoiceId = FALLBACK_VOICE_ID;
  }

  return resolvedVoiceId;
}

export async function POST(request: NextRequest) {
  const { text } = (await request.json()) as { text: string };
  if (!text?.trim()) return new Response("Bad request", { status: 400 });

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return new Response("ElevenLabs not configured", { status: 503 });

  const voiceId = await getVoiceId(apiKey);

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: text.trim().slice(0, 2500),
        model_id: "eleven_turbo_v2_5",
        voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.2 },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("[ElevenLabs]", res.status, err.slice(0, 200));
    // If this voice also fails, reset cache so next request retries discovery
    resolvedVoiceId = null;
    return new Response("TTS error", { status: res.status });
  }

  return new Response(res.body, {
    headers: { "Content-Type": "audio/mpeg" },
  });
}
