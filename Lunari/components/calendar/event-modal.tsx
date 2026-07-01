"use client";

import { useState } from "react";
import { X, Trash2, Clock, AlignLeft, Users, Hash, RefreshCw } from "lucide-react";
import { Button } from "@/components/optics/button";
import { Input } from "@/components/optics/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/optics/avatar";
import { createEvent, updateEvent, deleteEvent } from "@/lib/actions/calendar";
import type { CalendarEvent } from "@/components/calendar/calendar-view";
import type { RecurrenceType } from "@/lib/actions/calendar";

const RECURRENCE_OPTIONS: { value: RecurrenceType | ""; label: string }[] = [
  { value: "", label: "Does not repeat" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

function toLocalDatetimeValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultStart(date: Date | null): string {
  const d = date ? new Date(date) : new Date();
  d.setMinutes(0, 0, 0);
  return toLocalDatetimeValue(d.toISOString());
}

function defaultEnd(startValue: string): string {
  const d = new Date(startValue);
  d.setHours(d.getHours() + 1);
  return toLocalDatetimeValue(d.toISOString());
}

export function EventModal({
  workspaceId,
  initialDate,
  event,
  members,
  channels,
  currentUserId,
  onClose,
  onCreated,
  onUpdated,
  onDeleted,
}: {
  workspaceId: string;
  initialDate: Date | null;
  event: CalendarEvent | null;
  members: { id: string; display_name: string; avatar_url: string | null }[];
  channels: { id: string; name: string }[];
  currentUserId: string;
  onClose: () => void;
  onCreated: (event: CalendarEvent) => void;
  onUpdated: (event: CalendarEvent) => void;
  onDeleted: (eventId: string) => void;
}) {
  const isEdit = !!event;
  const startDefault = event ? toLocalDatetimeValue(event.start_at) : defaultStart(initialDate);
  const endDefault = event ? toLocalDatetimeValue(event.end_at) : defaultEnd(startDefault);

  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [startAt, setStartAt] = useState(startDefault);
  const [endAt, setEndAt] = useState(endDefault);
  const [allDay, setAllDay] = useState(event?.all_day ?? false);
  const [recurrence, setRecurrence] = useState<RecurrenceType | "">(
    (event?.recurrence as RecurrenceType | null) ?? ""
  );
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(
    event?.recurrence_end_date ? event.recurrence_end_date.slice(0, 10) : ""
  );
  const [channelId, setChannelId] = useState(event?.channel_id ?? "");
  const [attendeeIds, setAttendeeIds] = useState<string[]>(
    event?.attendees.map((a) => a.id) ?? [currentUserId]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartChange = (value: string) => {
    setStartAt(value);
    if (new Date(value) >= new Date(endAt)) {
      const end = new Date(value);
      end.setHours(end.getHours() + 1);
      setEndAt(toLocalDatetimeValue(end.toISOString()));
    }
  };

  const toggleAttendee = (id: string) => {
    setAttendeeIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!title.trim()) { setError("Title is required"); return; }
    if (!startAt || !endAt) { setError("Start and end times are required"); return; }
    if (new Date(endAt) < new Date(startAt)) { setError("End must be after start"); return; }

    setSaving(true);
    setError(null);

    if (isEdit) {
      const result = await updateEvent(
        event.id,
        workspaceId,
        {
          title: title.trim(),
          description: description.trim() || null,
          start_at: new Date(startAt).toISOString(),
          end_at: new Date(endAt).toISOString(),
          all_day: allDay,
          recurrence: recurrence || null,
          recurrence_end_date: recurrenceEndDate ? new Date(recurrenceEndDate).toISOString() : null,
          channel_id: channelId || null,
        },
        attendeeIds
      );
      if (result.error) { setError(result.error); setSaving(false); return; }

      onUpdated({
        ...event,
        title: title.trim(),
        description: description.trim() || null,
        start_at: new Date(startAt).toISOString(),
        end_at: new Date(endAt).toISOString(),
        all_day: allDay,
        recurrence: recurrence || null,
        recurrence_end_date: recurrenceEndDate ? new Date(recurrenceEndDate).toISOString() : null,
        channel_id: channelId || null,
        attendees: members.filter((m) => attendeeIds.includes(m.id)),
      });
    } else {
      const fd = new FormData();
      fd.set("workspace_id", workspaceId);
      fd.set("title", title.trim());
      fd.set("description", description.trim());
      fd.set("start_at", new Date(startAt).toISOString());
      fd.set("end_at", new Date(endAt).toISOString());
      fd.set("all_day", String(allDay));
      fd.set("recurrence", recurrence);
      fd.set("recurrence_end_date", recurrenceEndDate ? new Date(recurrenceEndDate).toISOString() : "");
      fd.set("channel_id", channelId);
      for (const id of attendeeIds) fd.append("attendee_ids", id);

      const result = await createEvent(fd);
      if (result.error) { setError(result.error); setSaving(false); return; }

      // optimistic add — page will revalidate on next navigation
      onCreated({
        id: crypto.randomUUID(),
        title: title.trim(),
        description: description.trim() || null,
        start_at: new Date(startAt).toISOString(),
        end_at: new Date(endAt).toISOString(),
        all_day: allDay,
        recurrence: recurrence || null,
        recurrence_end_date: recurrenceEndDate ? new Date(recurrenceEndDate).toISOString() : null,
        channel_id: channelId || null,
        created_by: currentUserId,
        attendees: members.filter((m) => attendeeIds.includes(m.id)),
      });
    }

    onClose();
  };

  const handleDelete = async () => {
    if (!event || !confirm("Delete this event?")) return;
    const result = await deleteEvent(event.id, workspaceId);
    if (result.error) { setError(result.error); return; }
    onDeleted(event.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-background shadow-2xl ring-1 ring-foreground/10">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-base font-semibold">{isEdit ? "Edit event" : "New event"}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto">
          <div className="space-y-4 p-5">
            {/* Title */}
            <Input
              autoFocus
              placeholder="Event title"
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
            />

            {/* All day */}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                className="cursor-pointer accent-primary"
              />
              All day
            </label>

            {/* Time */}
            {!allDay && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3" /> Start
                  </div>
                  <input
                    type="datetime-local"
                    value={startAt}
                    onChange={(e) => handleStartChange(e.target.value)}
                    className="w-full rounded-lg border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                  />
                </div>
                <div>
                  <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3" /> End
                  </div>
                  <input
                    type="datetime-local"
                    value={endAt}
                    min={startAt}
                    onChange={(e) => setEndAt(e.target.value)}
                    className="w-full rounded-lg border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                  />
                </div>
              </div>
            )}

            {allDay && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Start date</div>
                  <input
                    type="date"
                    value={startAt.slice(0, 10)}
                    onChange={(e) => { setStartAt(e.target.value + "T00:00"); setEndAt(e.target.value + "T23:59"); }}
                    className="w-full rounded-lg border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                  />
                </div>
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">End date</div>
                  <input
                    type="date"
                    value={endAt.slice(0, 10)}
                    min={startAt.slice(0, 10)}
                    onChange={(e) => setEndAt(e.target.value + "T23:59")}
                    className="w-full rounded-lg border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                  />
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                <AlignLeft className="size-3" /> Description
              </div>
              <textarea
                placeholder="Add a description…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40 min-h-[60px]"
              />
            </div>

            {/* Recurrence */}
            <div>
              <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                <RefreshCw className="size-3" /> Recurrence
              </div>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as RecurrenceType | "")}
                className="w-full rounded-lg border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              >
                {RECURRENCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {recurrence && (
                <div className="mt-2">
                  <div className="mb-1 text-xs text-muted-foreground">End date (optional)</div>
                  <input
                    type="date"
                    value={recurrenceEndDate}
                    onChange={(e) => setRecurrenceEndDate(e.target.value)}
                    className="w-full rounded-lg border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                  />
                </div>
              )}
            </div>

            {/* Channel link */}
            {channels.length > 0 && (
              <div>
                <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Hash className="size-3" /> Announce in channel
                </div>
                <select
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value)}
                  className="w-full rounded-lg border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                >
                  <option value="">None</option>
                  {channels.map((c) => (
                    <option key={c.id} value={c.id}>#{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Attendees */}
            {members.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="size-3" /> Attendees
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {members.map((m) => {
                    const selected = attendeeIds.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleAttendee(m.id)}
                        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                          selected ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
                        }`}
                      >
                        <Avatar size="sm" className="size-4">
                          {m.avatar_url && <AvatarImage src={m.avatar_url} width={16} height={16} alt="" />}
                          <AvatarFallback className="bg-black text-white text-[7px] font-bold uppercase">
                            {m.display_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        {m.display_name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-5 py-4">
          {isEdit ? (
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 text-sm text-destructive hover:underline"
            >
              <Trash2 className="size-4" /> Delete event
            </button>
          ) : <div />}
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSubmit} disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create event"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
