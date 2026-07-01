"use client";

import { useMemo } from "react";
import { isSameDay } from "@/lib/calendar-utils";
import type { CalendarEvent } from "@/components/calendar/calendar-view";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const EVENT_COLORS = [
  "bg-violet-500", "bg-sky-500", "bg-emerald-500",
  "bg-rose-500", "bg-amber-500", "bg-indigo-500",
];

function eventColor(id: string): string {
  const base = id.replace(/_\d+$/, "");
  const hash = base.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return EVENT_COLORS[hash % EVENT_COLORS.length];
}

export function MonthGrid({
  cursor,
  events,
  onDayClick,
  onEventClick,
}: {
  cursor: Date;
  events: CalendarEvent[];
  onDayClick: (d: Date) => void;
  onEventClick: (e: CalendarEvent) => void;
}) {
  const today = new Date();

  const cells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev = new Date(year, month, 0).getDate();

    const days: { date: Date; isCurrentMonth: boolean }[] = [];
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month - 1, daysInPrev - i), isCurrentMonth: false });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
    return days;
  }, [cursor]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const ev of events) {
      const key = new Date(ev.start_at).toDateString();
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    }
    return map;
  }, [events]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b">
        {DAYS.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid flex-1 grid-cols-7 grid-rows-6 overflow-hidden">
        {cells.map(({ date, isCurrentMonth }, i) => {
          const isToday = isSameDay(date, today);
          const dayEvents = eventsByDate[date.toDateString()] ?? [];

          return (
            <div
              key={i}
              onClick={() => onDayClick(date)}
              className={`min-h-0 cursor-pointer border-b border-r p-1 transition-colors hover:bg-muted/30 ${
                !isCurrentMonth ? "bg-muted/10 text-muted-foreground" : ""
              }`}
            >
              <div className={`mb-1 flex size-6 items-center justify-center rounded-full text-xs font-medium ${
                isToday ? "bg-primary text-primary-foreground" : ""
              }`}>
                {date.getDate()}
              </div>
              <div className="space-y-0.5 overflow-hidden">
                {dayEvents.slice(0, 3).map((ev) => (
                  <button
                    key={ev.id}
                    onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                    className={`w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-medium text-white ${eventColor(ev.id)}`}
                  >
                    {ev.all_day ? "" : new Date(ev.start_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) + " "}
                    {ev.title}
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <p className="px-1 text-[10px] text-muted-foreground">+{dayEvents.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
