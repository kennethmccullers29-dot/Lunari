import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DAILY_BASE = "https://api.daily.co/v1";

function dailyHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
  };
}

async function getOrCreateRoom(name: string): Promise<string> {
  const getRes = await fetch(`${DAILY_BASE}/rooms/${name}`, {
    headers: dailyHeaders(),
  });

  if (getRes.ok) {
    return ((await getRes.json()) as { url: string }).url;
  }

  const createRes = await fetch(`${DAILY_BASE}/rooms`, {
    method: "POST",
    headers: dailyHeaders(),
    body: JSON.stringify({
      name,
      privacy: "private",
      properties: {
        enable_screenshare: true,
        enable_video_processing_ui: false,
        start_video_off: false,
        start_audio_off: false,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
      },
    }),
  });

  if (createRes.ok) {
    return ((await createRes.json()) as { url: string }).url;
  }

  const err = await createRes.json() as { error?: string; info?: string };
  // Race condition: another request created the room between our GET and POST.
  // Retry the GET once before giving up.
  if (err.info?.includes("already exists")) {
    const retryRes = await fetch(`${DAILY_BASE}/rooms/${name}`, { headers: dailyHeaders() });
    if (retryRes.ok) return ((await retryRes.json()) as { url: string }).url;
  }

  throw new Error(`Daily room create failed: ${JSON.stringify(err)}`);
}

async function createMeetingToken(
  roomName: string,
  userName: string,
  userId: string
): Promise<string> {
  const res = await fetch(`${DAILY_BASE}/meeting-tokens`, {
    method: "POST",
    headers: dailyHeaders(),
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        user_name: userName,
        user_id: userId,
        is_owner: false,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8, // 8-hour token
        enable_screenshare: true,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Daily token create failed: ${err}`);
  }

  const data = await res.json();
  return data.token as string;
}

export async function POST(req: NextRequest) {
  if (!process.env.DAILY_API_KEY) {
    return NextResponse.json(
      { error: "DAILY_API_KEY is not configured" },
      { status: 500 }
    );
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { channelId } = await req.json();
  if (!channelId) {
    return NextResponse.json({ error: "channelId required" }, { status: 400 });
  }

  // Verify the user can access this channel.
  const { data: channel } = await supabase
    .from("channels")
    .select("id, workspace_id, type")
    .eq("id", channelId)
    .single();

  if (!channel || channel.type !== "voice") {
    return NextResponse.json({ error: "Not a voice channel" }, { status: 404 });
  }

  // Fetch the caller's display name for the video tile label.
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userData.user.id)
    .single();

  const userName = profile?.display_name ?? userData.user.email ?? "Guest";
  const roomName = channelId; // Channel UUID doubles as the Daily room name.

  try {
    const [roomUrl, token] = await Promise.all([
      getOrCreateRoom(roomName),
      createMeetingToken(roomName, userName, userData.user.id),
    ]);

    return NextResponse.json({ roomUrl, token });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
