import type { CalendarEvent } from "@/components/calendar/calendar-view";

// Expand recurring events into individual occurrences within [rangeStart, rangeEnd].
export function expandRecurring(
  events: CalendarEvent[],
  rangeStart: Date,
  rangeEnd: Date
): CalendarEvent[] {
  const result: CalendarEvent[] = [];

  for (const event of events) {
    if (!event.recurrence) {
      result.push(event);
      continue;
    }

    const start = new Date(event.start_at);
    const end = new Date(event.end_at);
    const duration = end.getTime() - start.getTime();
    const recurrenceEnd = event.recurrence_end_date ? new Date(event.recurrence_end_date) : null;

    let current = new Date(start);
    let occurrenceIndex = 0;
    const maxOccurrences = 365;

    while (current <= rangeEnd && occurrenceIndex < maxOccurrences) {
      if (recurrenceEnd && current > recurrenceEnd) break;

      if (current >= rangeStart) {
        const occEnd = new Date(current.getTime() + duration);
        result.push({
          ...event,
          id: occurrenceIndex === 0 ? event.id : `${event.id}_${occurrenceIndex}`,
          start_at: current.toISOString(),
          end_at: occEnd.toISOString(),
        });
      }

      const next = new Date(current);
      switch (event.recurrence) {
        case "daily":   next.setDate(next.getDate() + 1); break;
        case "weekly":  next.setDate(next.getDate() + 7); break;
        case "monthly": next.setMonth(next.getMonth() + 1); break;
        case "yearly":  next.setFullYear(next.getFullYear() + 1); break;
      }
      current = next;
      occurrenceIndex++;
    }
  }

  return result.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
