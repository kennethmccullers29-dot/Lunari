import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CalendarView } from "@/components/calendar/calendar-view";

export default async function CalendarPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  // Fetch 3 months worth of events to cover month navigation
  const from = new Date();
  from.setMonth(from.getMonth() - 1);
  from.setDate(1);
  const to = new Date();
  to.setMonth(to.getMonth() + 2);
  to.setDate(0);

  const { data: eventsData } = await supabase
    .from("workspace_events")
    .select("id, title, description, start_at, end_at, all_day, recurrence, recurrence_end_date, channel_id, created_by")
    .eq("workspace_id", workspaceId)
    .gte("start_at", from.toISOString())
    .lte("start_at", to.toISOString())
    .order("start_at");

  const eventIds = (eventsData ?? []).map((e) => e.id);
  const { data: attendeesData } = await supabase
    .from("event_attendees")
    .select("event_id, user_id, profiles(id, display_name, avatar_url)")
    .in("event_id", eventIds.length > 0 ? eventIds : ["00000000-0000-0000-0000-000000000000"]);

  const { data: memberData } = await supabase
    .from("workspace_members")
    .select("profiles(id, display_name, avatar_url)")
    .eq("workspace_id", workspaceId);

  const { data: channelsData } = await supabase
    .from("channels")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .eq("is_private", false)
    .order("name");

  type MemberProfile = { id: string; display_name: string; avatar_url: string | null };
  const members = ((memberData ?? []) as unknown as { profiles: MemberProfile | null }[])
    .map((r) => r.profiles)
    .filter((p): p is MemberProfile => !!p);

  type AttendeeRow = { event_id: string; user_id: string; profiles: MemberProfile | null };
  const attendeesByEvent: Record<string, MemberProfile[]> = {};
  for (const row of (attendeesData ?? []) as unknown as AttendeeRow[]) {
    if (!attendeesByEvent[row.event_id]) attendeesByEvent[row.event_id] = [];
    if (row.profiles) attendeesByEvent[row.event_id].push(row.profiles);
  }

  const events = (eventsData ?? []).map((e) => ({
    ...e,
    attendees: attendeesByEvent[e.id] ?? [],
  }));

  return (
    <CalendarView
      workspaceId={workspaceId}
      events={events}
      members={members}
      channels={channelsData ?? []}
      currentUserId={userData.user.id}
    />
  );
}
