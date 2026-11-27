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
/** The real instant that reads as `hour`:`minute` on a wall clock in
 *  `sourceZone`, on whatever calendar day `referenceDate` falls on in that
 *  same zone — e.g. "12:00 in America/New_York, today" → the actual UTC
 *  instant that is. Used for a fixed recurring wall-clock time (a weekly
 *  live training slot) that needs converting into a real instant once, so
 *  it can then be displayed in anyone else's own zone via a plain
 *  Intl.DateTimeFormat — the standard "guess as UTC, then correct by
 *  however far off that guess reads in the real zone" trick, which
 *  self-corrects for DST on whatever date is actually in play. */
export function zonedWallTimeToInstant(
  hour: number,
  minute: number,
  sourceZone: string,
  referenceDate: Date = new Date(),
): Date {
  const todayInZone = new Intl.DateTimeFormat("en-US", {
    timeZone: sourceZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(referenceDate);
  const get = (type: string) =>
    Number(todayInZone.find((p) => p.type === type)?.value ?? 0);
  const guess = Date.UTC(get("year"), get("month") - 1, get("day"), hour, minute);

  const readBack = new Intl.DateTimeFormat("en-US", {
    timeZone: sourceZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date(guess));
  const getBack = (type: string) =>
    Number(readBack.find((p) => p.type === type)?.value ?? 0);
  const readAsUtc = Date.UTC(
    getBack("year"),
    getBack("month") - 1,
    getBack("day"),
    getBack("hour"),
    getBack("minute"),
  );
  return new Date(guess + (guess - readAsUtc));
}

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
