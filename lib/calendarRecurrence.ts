// Pure date math only (no `db`/server imports) — the Overview calendar
// widget imports this directly on the client to expand a recurring event
// into the individual occurrences that fall within whatever month/week/day
// is currently being viewed, rather than round-tripping to the server
// every time the admin clicks "next week."

export type CalendarEventRecord = {
  id: string;
  title: string;
  description: string | null;
  link: string | null;
  phoneNumber: string | null;
  location: string | null;
  startAt: Date;
  endAt: Date;
  recurring: boolean;
  recurrenceEndAt: Date | null;
};

export type CalendarOccurrence = CalendarEventRecord & {
  occurrenceStart: Date;
  occurrenceEnd: Date;
  // A recurring event's own `id` repeats across every occurrence — this is
  // what's actually unique per rendered block (React keys, "which block did
  // they click").
  occurrenceKey: string;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Expands every event into the occurrence(s) of it that overlap
 *  [rangeStart, rangeEnd) — a non-recurring event is either in range or
 *  it isn't; a recurring one repeats weekly from its own `startAt`
 *  (same weekday and time of day) until `recurrenceEndAt`, or forever if
 *  that's null. Operates in UTC throughout (exactly 7*24h per step) rather
 *  than a viewer-local calendar — the one practical effect is a recurring
 *  event can land an hour off its usual wall-clock time for US viewers in
 *  the first week either side of a DST change, same simplification an
 *  admin manually re-adding a weekly event by eye would also live with. */
export function expandOccurrences(
  events: CalendarEventRecord[],
  rangeStart: Date,
  rangeEnd: Date,
): CalendarOccurrence[] {
  const result: CalendarOccurrence[] = [];

  for (const event of events) {
    const duration = event.endAt.getTime() - event.startAt.getTime();

    if (!event.recurring) {
      if (event.startAt < rangeEnd && event.endAt > rangeStart) {
        result.push({
          ...event,
          occurrenceStart: event.startAt,
          occurrenceEnd: event.endAt,
          occurrenceKey: event.id,
        });
      }
      continue;
    }

    // Fast-forward to the first candidate occurrence at or after
    // rangeStart, in whole-week steps from the series' own anchor date
    // (never before it, even if rangeStart precedes the series' start).
    let cursor = event.startAt.getTime();
    if (cursor < rangeStart.getTime()) {
      const weeksToSkip = Math.floor((rangeStart.getTime() - cursor) / WEEK_MS);
      cursor += weeksToSkip * WEEK_MS;
      while (cursor < rangeStart.getTime()) cursor += WEEK_MS;
    }

    const seriesEndMs = event.recurrenceEndAt?.getTime() ?? Infinity;
    while (cursor < rangeEnd.getTime() && cursor <= seriesEndMs) {
      const occurrenceStart = new Date(cursor);
      const occurrenceEnd = new Date(cursor + duration);
      if (occurrenceStart < rangeEnd && occurrenceEnd > rangeStart) {
        result.push({
          ...event,
          occurrenceStart,
          occurrenceEnd,
          occurrenceKey: `${event.id}:${occurrenceStart.toISOString()}`,
        });
      }
      cursor += WEEK_MS;
    }
  }

  return result.sort(
    (a, b) => a.occurrenceStart.getTime() - b.occurrenceStart.getTime(),
  );
}

/** Midnight (local) on the Monday on/before `date` — matches the reference
 *  Google Calendar screenshots this widget's layout is modeled on (both the
 *  week view and the month grid headers run Mon-Sun there). */
export function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatEventRange(start: Date, end: Date): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

// A 31-day month starting on a Friday, Saturday, or Sunday needs a full 6
// rows to show its last day or two (e.g. the 1st on a Sunday puts the 30th
// and 31st in the 6th row's Mon/Tue) — 5 isn't enough to guarantee the
// whole month is ever visible, so this stays at 6 despite the extra row of
// scrolling that costs on months that don't need it.
export const MONTH_GRID_WEEKS = 6;

/** The 6-row grid a month view actually renders — Monday of the week
 *  containing the 1st, padded to a full 6*7 days so every month renders
 *  the same fixed-height grid regardless of how many weeks it spans. */
export function monthGridRange(monthAnchor: Date): { start: Date; end: Date } {
  const firstOfMonth = new Date(
    monthAnchor.getFullYear(),
    monthAnchor.getMonth(),
    1,
  );
  const start = startOfWeek(firstOfMonth);
  const end = addDays(start, MONTH_GRID_WEEKS * 7);
  return { start, end };
}
