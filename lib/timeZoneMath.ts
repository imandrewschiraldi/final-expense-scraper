/** How `date` reads on a wall clock in `timeZone`, returned as a Date
 *  object whose OWN local (runtime) fields equal that reading — e.g. if
 *  `date` is some real instant and `timeZone` is "America/Los_Angeles",
 *  the returned Date's getHours()/getDate()/toLocaleDateString()/etc. all
 *  read exactly as they would on a clock in LA, regardless of what zone
 *  this code actually runs in.
 *
 *  This is the one piece of machinery the whole Calendar's timezone
 *  support rests on: shift every real-instant value (a fetched event's
 *  startAt/endAt, "today") through this once, right where it enters
 *  CalendarWidget, and every existing date-math/formatting helper
 *  (lib/calendarRecurrence.ts's startOfWeek/startOfDay/addDays/
 *  isSameDay/monthGridRange/expandOccurrences, MonthGrid, TimeGrid,
 *  toLocaleDateString calls, …) already works correctly on it completely
 *  unchanged, because all of them only ever read local fields — they were
 *  never written to assume those fields are specifically the *browser's*
 *  zone, just *a* consistent one.
 *
 *  The real instant this returns (its own getTime()) is NOT itself
 *  meaningful — it's offset from the true instant by (this runtime's own
 *  zone vs. `timeZone`), on purpose, as the mechanism for the trick above.
 *  Never send it anywhere (an API call, a form field meant to be edited
 *  and resubmitted) and never compare it against an un-shifted Date; it
 *  exists only to be read via its own local getters/toLocaleString. */
export function shiftToZone(date: Date, timeZone?: string): Date {
  if (!timeZone) return date;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return new Date(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
}
