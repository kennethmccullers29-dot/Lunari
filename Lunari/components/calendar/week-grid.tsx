"use client";

import { Fragment, useMemo } from "react";
import { isSameDay, startOfDay } from "@/lib/calendar-utils";
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

export function WeekGrid({
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

  const days = useMemo(() => {
    const start = new Date(cursor);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [cursor]);

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const day of days) {
      map[day.toDateString()] = events.filter((e) => isSameDay(new Date(e.start_at), day));
    }
    return map;
  }, [events, days]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-[3.5rem_repeat(7,1fr)] border-b">
        <div />
        {days.map((d) => {
          const isToday = isSameDay(d, today);
          return (
            <div key={d.toDateString()} className="py-2 text-center">
              <div className="text-xs text-muted-foreground">{d.toLocaleDateString("en-US", { weekday: "short" })}</div>
              <div className={`mx-auto mt-0.5 flex size-7 items-center justify-center rounded-full text-sm font-medium ${isToday ? "bg-primary text-primary-foreground" : ""}`}>
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-[3.5rem_repeat(7,1fr)]">
          {HOURS.map((hour) => (
            <Fragment key={hour}>
              {/* Hour label */}
              <div className="relative h-14 border-b pr-2 text-right">
                {hour > 0 && (
                  <span className="absolute -top-2 right-2 text-[10px] text-muted-foreground">
                    {hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                  </span>
                )}
              </div>
              {/* Day cells */}
              {days.map((day) => {
                const cellDate = new Date(day);
                cellDate.setHours(hour, 0, 0, 0);
                const dayEvents = (eventsByDay[day.toDateString()] ?? []).filter(
                  (e) => new Date(e.start_at).getHours() === hour
                );

                return (
                  <div
                    key={`${day.toDateString()}-${hour}`}
                    className="relative h-14 cursor-pointer border-b border-l hover:bg-muted/20"
                    onClick={() => onSlotClick(cellDate)}
                  >
                    {dayEvents.map((ev) => {
                      const startMin = new Date(ev.start_at).getMinutes();
                      const durMin = Math.max(
                        30,
                        (new Date(ev.end_at).getTime() - new Date(ev.start_at).getTime()) / 60000
                      );
                      const top = (startMin / 60) * 56;
                      const height = Math.min((durMin / 60) * 56, 56 - top);

                      return (
                        <button
                          key={ev.id}
                          onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                          style={{ top, height: Math.max(height, 16) }}
                          className={`absolute inset-x-0.5 z-10 truncate rounded px-1 text-left text-[10px] font-medium text-white ${eventColor(ev.id)}`}
                        >
                          {ev.title}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
