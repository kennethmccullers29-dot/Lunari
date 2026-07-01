"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus, CalendarDays } from "lucide-react";
import { Button } from "@/components/optics/button";
import { MonthGrid } from "@/components/calendar/month-grid";
import { WeekGrid } from "@/components/calendar/week-grid";
import { DayGrid } from "@/components/calendar/day-grid";
import { EventModal } from "@/components/calendar/event-modal";
import { expandRecurring } from "@/lib/calendar-utils";

export type CalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  all_day: boolean;
  recurrence: string | null;
  recurrence_end_date: string | null;
  channel_id: string | null;
  created_by: string;
  attendees: { id: string; display_name: string; avatar_url: string | null }[];
};

type View = "month" | "week" | "day";

export function CalendarView({
  workspaceId,
  events: initialEvents,
  members,
  channels,
  currentUserId,
}: {
  workspaceId: string;
  events: CalendarEvent[];
  members: { id: string; display_name: string; avatar_url: string | null }[];
  channels: { id: string; name: string }[];
  currentUserId: string;
}) {
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Expand recurring events into all their occurrences within a visible window
  const visibleRange = useMemo(() => {
    const start = new Date(cursor);
    const end = new Date(cursor);
    if (view === "month") {
      start.setDate(1); start.setMonth(start.getMonth() - 1);
      end.setDate(1); end.setMonth(end.getMonth() + 2);
    } else if (view === "week") {
      const day = start.getDay();
      start.setDate(start.getDate() - day);
      end.setDate(start.getDate() + 13);
    } else {
      end.setDate(end.getDate() + 1);
    }
    return { start, end };
  }, [view, cursor]);

  const expandedEvents = useMemo(
    () => expandRecurring(events, visibleRange.start, visibleRange.end),
    [events, visibleRange]
  );

  const navigate = (dir: -1 | 1) => {
    setCursor((prev) => {
      const d = new Date(prev);
      if (view === "month") d.setMonth(d.getMonth() + dir);
      else if (view === "week") d.setDate(d.getDate() + 7 * dir);
      else d.setDate(d.getDate() + dir);
      return d;
    });
  };

  const headerLabel = () => {
    if (view === "month")
      return cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (view === "week") {
      const start = new Date(cursor);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return cursor.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  };

  const handleEventCreated = (event: CalendarEvent) => {
    setEvents((prev) => [...prev, event]);
  };

  const handleEventUpdated = (event: CalendarEvent) => {
    setEvents((prev) => prev.map((e) => (e.id === event.id ? event : e)));
  };

  const handleEventDeleted = (eventId: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
  };

  const openCreate = (date?: Date) => {
    setSelectedDate(date ?? cursor);
    setEditingEvent(null);
    setModalOpen(true);
  };

  const openEdit = (event: CalendarEvent) => {
    setEditingEvent(event);
    setSelectedDate(null);
    setModalOpen(true);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-5 text-muted-foreground" />
          <h1 className="text-sm font-semibold">Calendar</h1>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCursor(new Date())}
            className="rounded-md border px-2.5 py-1 text-xs hover:bg-muted"
          >
            Today
          </button>
          <button onClick={() => navigate(-1)} className="rounded-md p-1 hover:bg-muted">
            <ChevronLeft className="size-4" />
          </button>
          <button onClick={() => navigate(1)} className="rounded-md p-1 hover:bg-muted">
            <ChevronRight className="size-4" />
          </button>
          <span className="min-w-40 text-center text-sm font-medium">{headerLabel()}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border overflow-hidden text-xs">
            {(["month", "week", "day"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 capitalize transition-colors ${view === v ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                {v}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={() => openCreate()}>
            <Plus className="size-3.5" />
            New event
          </Button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {view === "month" && (
          <MonthGrid
            cursor={cursor}
            events={expandedEvents}
            onDayClick={(d) => { setCursor(d); openCreate(d); }}
            onEventClick={openEdit}
          />
        )}
        {view === "week" && (
          <WeekGrid
            cursor={cursor}
            events={expandedEvents}
            onSlotClick={(d) => openCreate(d)}
            onEventClick={openEdit}
          />
        )}
        {view === "day" && (
          <DayGrid
            cursor={cursor}
            events={expandedEvents}
            onSlotClick={(d) => openCreate(d)}
            onEventClick={openEdit}
          />
        )}
      </div>

      {/* Event create/edit modal */}
      {modalOpen && (
        <EventModal
          workspaceId={workspaceId}
          initialDate={selectedDate}
          event={editingEvent}
          members={members}
          channels={channels}
          currentUserId={currentUserId}
          onClose={() => { setModalOpen(false); setEditingEvent(null); }}
          onCreated={handleEventCreated}
          onUpdated={handleEventUpdated}
          onDeleted={handleEventDeleted}
        />
      )}
    </div>
  );
}
