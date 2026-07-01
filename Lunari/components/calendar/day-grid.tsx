"use client";

import { Fragment } from "react";
import { isSameDay } from "@/lib/calendar-utils";
import type { CalendarEvent } from "@/components/calendar/calendar-view";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const EVENT_COLORS = [
  "bg-violet-500", "bg-sky-500", "bg-emerald-500",
  "bg-rose-500", "bg-amber-500", "bg-indigo-500",
];

function eventColor(id: string): string {
  const base = id.replace(/_\d+$/, "");
  const hash = base.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return EVENT_COLORS[hash % EVENT_COLORS.length];
}

export function DayGrid({
  cursor,
  events,
  onSlotClick,
  onEventClick,
}: {
  cursor: Date;
  events: CalendarEvent[];
  onSlotClick: (d: Date) => void;
  onEventClick: (e: CalendarEvent) => void;
}) {
  const today = new Date();
  const isToday = isSameDay(cursor, today);
  const dayEvents = events.filter((e) => isSameDay(new Date(e.start_at), cursor));

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Day header */}
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <span className="text-xs text-muted-foreground">
          {cursor.toLocaleDateString("en-US", { weekday: "long" })}
        </span>
        <div className={`flex size-8 items-center justify-center rounded-full text-sm font-semibold ${isToday ? "bg-primary text-primary-foreground" : ""}`}>
          {cursor.getDate()}
        </div>
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-[3.5rem_1fr]">
          {HOURS.map((hour) => {
            const slotDate = new Date(cursor);
            slotDate.setHours(hour, 0, 0, 0);
            const hourEvents = dayEvents.filter((e) => new Date(e.start_at).getHours() === hour);

            return (
              <Fragment key={hour}>
                <div className="relative h-16 border-b pr-2 text-right">
                  {hour > 0 && (
                    <span className="absolute -top-2 right-2 text-[10px] text-muted-foreground">
                      {hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                    </span>
                  )}
                </div>
                <div
                  key={`cell${hour}`}
                  className="relative h-16 cursor-pointer border-b border-l hover:bg-muted/20"
                  onClick={() => onSlotClick(slotDate)}
                >
                  {hourEvents.map((ev) => {
                    const startMin = new Date(ev.start_at).getMinutes();
                    const durMin = Math.max(
                      30,
                      (new Date(ev.end_at).getTime() - new Date(ev.start_at).getTime()) / 60000
                    );
                    const top = (startMin / 60) * 64;
                    const height = Math.min((durMin / 60) * 64, 64 - top);

                    return (
                      <button
                        key={ev.id}
                        onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                        style={{ top, height: Math.max(height, 20) }}
                        className={`absolute inset-x-1 z-10 overflow-hidden rounded-md px-2 text-left text-xs font-medium text-white shadow ${eventColor(ev.id)}`}
                      >
                        <div className="truncate">{ev.title}</div>
                        <div className="truncate text-[10px] opacity-80">
                          {new Date(ev.start_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          {" – "}
                          {new Date(ev.end_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
