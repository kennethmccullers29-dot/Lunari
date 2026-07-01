"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type RecurrenceType = "daily" | "weekly" | "monthly" | "yearly";

export async function createEvent(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Not signed in" };

  const workspaceId = String(formData.get("workspace_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const startAt = String(formData.get("start_at") ?? "");
  const endAt = String(formData.get("end_at") ?? "");
  const allDay = formData.get("all_day") === "true";
  const recurrence = (formData.get("recurrence") as RecurrenceType | "") || null;
  const recurrenceEndDate = String(formData.get("recurrence_end_date") ?? "").trim() || null;
  const channelId = String(formData.get("channel_id") ?? "").trim() || null;
  const attendeeIds = formData.getAll("attendee_ids").map(String);

  if (!title) return { error: "Title is required" };
  if (!startAt || !endAt) return { error: "Start and end times are required" };
  if (new Date(endAt) < new Date(startAt)) return { error: "End time must be after start time" };

  const { data: event, error } = await supabase
    .from("workspace_events")
    .insert({
      workspace_id: workspaceId,
      title,
      description: description || null,
      start_at: startAt,
      end_at: endAt,
      all_day: allDay,
      recurrence,
      recurrence_end_date: recurrenceEndDate,
      channel_id: channelId,
      created_by: userData.user.id,
    })
    .select("id")
    .single();

  if (error || !event) return { error: error?.message ?? "Could not create event" };

  if (attendeeIds.length > 0) {
    await supabase
      .from("event_attendees")
      .insert(attendeeIds.map((uid) => ({ event_id: event.id, user_id: uid })));
  }

  // Post announcement to linked channel
  if (channelId) {
    const start = new Date(startAt);
    const dateStr = allDay
      ? start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
      : start.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    await supabase.from("messages").insert({
      channel_id: channelId,
      sender_id: userData.user.id,
      body: `📅 **${title}** has been added to the calendar — ${dateStr}${description ? `\n${description}` : ""}`,
    });
  }

  revalidatePath(`/w/${workspaceId}/calendar`);
  return {};
}

export async function updateEvent(
  eventId: string,
  workspaceId: string,
  updates: {
    title?: string;
    description?: string | null;
    start_at?: string;
    end_at?: string;
    all_day?: boolean;
    recurrence?: RecurrenceType | null;
    recurrence_end_date?: string | null;
    channel_id?: string | null;
  },
  attendeeIds?: string[]
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("workspace_events").update(updates).eq("id", eventId);
  if (error) return { error: error.message };

  if (attendeeIds !== undefined) {
    await supabase.from("event_attendees").delete().eq("event_id", eventId);
    if (attendeeIds.length > 0) {
      await supabase
        .from("event_attendees")
        .insert(attendeeIds.map((uid) => ({ event_id: eventId, user_id: uid })));
    }
  }

  revalidatePath(`/w/${workspaceId}/calendar`);
  return {};
}

export async function deleteEvent(eventId: string, workspaceId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("workspace_events").delete().eq("id", eventId);
  if (error) return { error: error.message };
  revalidatePath(`/w/${workspaceId}/calendar`);
  return {};
}
