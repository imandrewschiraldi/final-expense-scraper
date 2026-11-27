// Pure date math only (no `db`/server imports) — the Overview calendar
// widget imports this directly on the client to expand a recurring event
// into the individual occurrences that fall within whatever month/week/day
// is currently being viewed, rather than round-tripping to the server
// every time the admin clicks "next week."

export type RecurrenceRule =
  | "DAILY"
  | "WEEKDAYS"
  | "WEEKLY"
  | "BIWEEKLY"
  | "MONTHLY"
  | "YEARLY";

export const RECURRENCE_RULES: RecurrenceRule[] = [
  "DAILY",
  "WEEKDAYS",
  "WEEKLY",
  "BIWEEKLY",
  "MONTHLY",
  "YEARLY",
];

export const RECURRENCE_RULE_LABELS: Record<RecurrenceRule, string> = {
  DAILY: "Daily",
  WEEKDAYS: "Every weekday",
  WEEKLY: "Weekly",
  BIWEEKLY: "Every other week",
  MONTHLY: "Monthly",
  YEARLY: "Annually",
};

export type CalendarEventRecord = {
  id: string;
  title: string;
  description: string | null;
  link: string | null;
  phoneNumber: string | null;
  location: string | null;
  startAt: Date;
  endAt: Date;
  allDay: boolean;
  color: string;
  scope: "AGENCY" | "PERSONAL";
  ownerId: string | null;
  recurrenceRule: RecurrenceRule | null;
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

/** One step forward along `rule` from `date`, keeping its time-of-day.
 *  `anchorDay` is the series' own original day-of-month (from its very
 *  first occurrence) — Monthly/Yearly always clamp back to that day, not
 *  whatever day the previous (possibly already-clamped) occurrence landed
 *  on, so "the 31st of every month" is Jan 31 -> Feb 28 -> Mar 31, not
 *  Jan 31 -> Feb 28 -> Mar 28. A month with no such day (Feb 30th) lands on
 *  that month's last day instead of being skipped — simplest reasonable
 *  behavior, no universal right answer for this case. */
function stepDate(date: Date, rule: RecurrenceRule, anchorDay: number): Date {
  const d = new Date(date);
  switch (rule) {
    case "DAILY":
      d.setDate(d.getDate() + 1);
      return d;
    case "WEEKDAYS":
      do {
        d.setDate(d.getDate() + 1);
      } while (d.getDay() === 0 || d.getDay() === 6);
      return d;
    case "WEEKLY":
      d.setDate(d.getDate() + 7);
      return d;
    case "BIWEEKLY":
      d.setDate(d.getDate() + 14);
      return d;
    case "MONTHLY": {
      d.setDate(1);
      d.setMonth(d.getMonth() + 1);
      const daysInTarget = new Date(
        d.getFullYear(),
        d.getMonth() + 1,
        0,
      ).getDate();
      d.setDate(Math.min(anchorDay, daysInTarget));
      return d;
    }
    case "YEARLY": {
      d.setDate(1);
      d.setFullYear(d.getFullYear() + 1);
      const daysInTarget = new Date(
        d.getFullYear(),
        d.getMonth() + 1,
        0,
      ).getDate();
      d.setDate(Math.min(anchorDay, daysInTarget));
      return d;
    }
  }
}

/** Expands every event into the occurrence(s) of it that overlap
 *  [rangeStart, rangeEnd) — a non-recurring event is either in range or it
 *  isn't; a recurring one repeats on its own rule from `startAt` (same
 *  time of day, and day-of-week/month where the rule cares) until
 *  `recurrenceEndAt`, or forever if that's null. Steps with the viewer's
 *  own local calendar (setDate/setMonth/setFullYear), not fixed millisecond
 *  jumps, so Monthly/Yearly land on the right calendar date and Daily/
 *  Weekly/Biweekly stay on their original time-of-day across a DST change
 *  instead of drifting an hour. */
export function expandOccurrences(
  events: CalendarEventRecord[],
  rangeStart: Date,
  rangeEnd: Date,
): CalendarOccurrence[] {
  const result: CalendarOccurrence[] = [];

  for (const event of events) {
    const duration = event.endAt.getTime() - event.startAt.getTime();

    if (!event.recurrenceRule) {
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

    const anchorDay = event.startAt.getDate();
    const seriesEndMs = event.recurrenceEndAt?.getTime() ?? Infinity;

    // Fast-forward to the first candidate occurrence that could still
    // overlap rangeStart (never before the series' own start, even if
    // rangeStart precedes it) — bounded by realistic calendar spans, so a
    // plain step loop (rather than a closed-form jump, which Monthly/
    // Yearly can't express as a fixed millisecond stride anyway) stays
    // cheap enough to run on every month/week navigation.
    let occurrenceStart = event.startAt;
    while (
      occurrenceStart.getTime() + duration <= rangeStart.getTime() &&
      occurrenceStart.getTime() <= seriesEndMs
    ) {
      occurrenceStart = stepDate(
        occurrenceStart,
        event.recurrenceRule,
        anchorDay,
      );
    }

    while (
      occurrenceStart.getTime() < rangeEnd.getTime() &&
      occurrenceStart.getTime() <= seriesEndMs
    ) {
      const occurrenceEnd = new Date(occurrenceStart.getTime() + duration);
      if (occurrenceStart < rangeEnd && occurrenceEnd > rangeStart) {
        result.push({
          ...event,
          occurrenceStart,
          occurrenceEnd,
          occurrenceKey: `${event.id}:${occurrenceStart.toISOString()}`,
        });
      }
      occurrenceStart = stepDate(
        occurrenceStart,
        event.recurrenceRule,
        anchorDay,
      );
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

// `timeZone` is the viewer's own Profile setting (see lib/timeZones.ts),
// threaded down from CalendarWidget — omitted, these fall back to the
// browser's own zone, the original behavior for everyone who hasn't set
// one. Display-only: which calendar day an occurrence is grouped under
// still goes by the browser's local day (see expandOccurrences/
// startOfWeek/startOfDay above), not this override — rethinking day
// bucketing itself around an arbitrary zone is a deeper change than a
// label format.
export function formatTime(date: Date, timeZone?: string): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    ...(timeZone ? { timeZone } : {}),
  });
}

export function formatEventRange(
  start: Date,
  end: Date,
  timeZone?: string,
): string {
  return `${formatTime(start, timeZone)} – ${formatTime(end, timeZone)}`;
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
