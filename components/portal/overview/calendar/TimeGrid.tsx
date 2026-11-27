"use client";

import { useEffect, useRef } from "react";
import {
  formatEventRange,
  formatTime,
  isSameDay,
  startOfDay,
  type CalendarOccurrence,
} from "@/lib/calendarRecurrence";
import { PIPELINE_STAGE_COLOR_CLASSES } from "@/lib/pipelineStageColors";

function barClass(color: string): string {
  return (
    PIPELINE_STAGE_COLOR_CLASSES[
      color as keyof typeof PIPELINE_STAGE_COLOR_CLASSES
    ]?.bar ?? PIPELINE_STAGE_COLOR_CLASSES.copper.bar
  );
}

const HOUR_HEIGHT = 48; // px
const HOURS = Array.from({ length: 24 }, (_, i) => i);
// The default visible window — 8am to 8pm fits with no scrolling needed;
// the full 24-hour grid is still there above/below it for an early-morning
// or evening event, just a scroll away instead of the default view.
const VISIBLE_START_HOUR = 8;
const VISIBLE_HOURS = 12;
const VIEWPORT_HEIGHT = VISIBLE_HOURS * HOUR_HEIGHT;

type LaidOutOccurrence = {
  occurrence: CalendarOccurrence;
  column: number;
  columnCount: number;
};

/** Greedy interval-graph column packing: events that don't overlap share a
 *  column, events that do get bumped to the next one — same idea
 *  Google Calendar's own day/week view uses for overlapping events,
 *  simplified to one shared column count for the whole day rather than
 *  recomputing a tighter width per overlapping cluster. */
function layoutDay(dayOccurrences: CalendarOccurrence[]): LaidOutOccurrence[] {
  const sorted = [...dayOccurrences].sort((a, b) => {
    const byStart = a.occurrenceStart.getTime() - b.occurrenceStart.getTime();
    if (byStart !== 0) return byStart;
    const aDuration = a.occurrenceEnd.getTime() - a.occurrenceStart.getTime();
    const bDuration = b.occurrenceEnd.getTime() - b.occurrenceStart.getTime();
    return bDuration - aDuration;
  });

  const columnEnds: number[] = [];
  const placed: { occurrence: CalendarOccurrence; column: number }[] = [];
  for (const occurrence of sorted) {
    let column = columnEnds.findIndex(
      (end) => end <= occurrence.occurrenceStart.getTime(),
    );
    if (column === -1) {
      column = columnEnds.length;
      columnEnds.push(occurrence.occurrenceEnd.getTime());
    } else {
      columnEnds[column] = occurrence.occurrenceEnd.getTime();
    }
    placed.push({ occurrence, column });
  }

  const columnCount = Math.max(columnEnds.length, 1);
  return placed.map(({ occurrence, column }) => ({
    occurrence,
    column,
    columnCount,
  }));
}

// No timeZone parameter here — `date` has already been shifted into the
// viewer's chosen zone once, upstream (see lib/timeZoneMath.ts), so its
// own local fields are already correct.
function minutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/** "GMT-5"/"GMT+1" — matches the reference screenshots' own corner label
 *  exactly (Intl's "shortOffset" form), computed from the viewer's chosen
 *  zone when they've set one, their own browser otherwise. */
function gmtOffsetLabel(timeZone?: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZoneName: "shortOffset",
    ...(timeZone ? { timeZone } : {}),
  }).formatToParts(new Date());
  return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
}

function EventBlock({
  laid,
  onClick,
  // True in day view (a single full-width column) — enough room to show
  // title, time, and the link all on one line, same as the reference
  // screenshot's day view. Week view's narrow columns stay compact
  // (truncated title, time only when the block's tall enough for a second
  // line).
  detailed,
}: {
  laid: LaidOutOccurrence;
  onClick: () => void;
  detailed: boolean;
}) {
  const { occurrence, column, columnCount } = laid;
  const top =
    (minutesSinceMidnight(occurrence.occurrenceStart) / 60) * HOUR_HEIGHT;
  const durationMinutes = Math.max(
    15,
    (occurrence.occurrenceEnd.getTime() -
      occurrence.occurrenceStart.getTime()) /
      60000,
  );
  const height = (durationMinutes / 60) * HOUR_HEIGHT;
  const widthPct = 100 / columnCount;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`absolute overflow-hidden rounded-md px-1.5 py-0.5 text-left text-[11px] leading-tight text-white shadow-sm transition-[filter] hover:brightness-110 ${barClass(occurrence.color)}`}
      style={{
        top,
        height,
        left: `calc(${column * widthPct}% + 2px)`,
        width: `calc(${widthPct}% - 4px)`,
      }}
      title={occurrence.title}
    >
      {detailed ? (
        <span className="block truncate">
          <span className="font-bold">{occurrence.title}, </span>
          {formatTime(occurrence.occurrenceStart)}
          {occurrence.link && <>, {occurrence.link}</>}
        </span>
      ) : (
        <>
          <span className="block truncate font-bold">{occurrence.title}</span>
          {height > 32 && (
            <span className="block truncate text-white/80">
              {formatEventRange(
                occurrence.occurrenceStart,
                occurrence.occurrenceEnd,
              )}
            </span>
          )}
        </>
      )}
    </button>
  );
}

/** Shared by the week view (7 days) and day view (1 day) — a vertical
 *  hour-by-hour grid with events positioned/sized by time and packed into
 *  side-by-side columns where they overlap. */
export function TimeGrid({
  days,
  occurrences,
  onEventClick,
  today,
  timeZone,
}: {
  days: Date[];
  occurrences: CalendarOccurrence[];
  onEventClick: (occurrence: CalendarOccurrence) => void;
  // Passed down from CalendarWidget (already shifted into the viewer's
  // chosen zone, see lib/timeZoneMath.ts) rather than computed locally —
  // see MonthGrid's identical prop for why.
  today: Date;
  // Only used for the corner "GMT-5" offset label below, which legitimately
  // needs the real zone name (not a shifted Date) to ask "what offset does
  // this zone have right now."
  timeZone?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: VISIBLE_START_HOUR * HOUR_HEIGHT });
    // Re-run whenever the visible days change (prev/next/today nav), not
    // just on first mount, so jumping weeks always lands back on business
    // hours instead of wherever the admin happened to scroll to before.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days[0]?.getTime()]);

  return (
    <div className="flex flex-col overflow-hidden rounded-[10px] border border-border">
      <div className="flex border-b border-border bg-surface2">
        <div className="flex w-14 shrink-0 items-end justify-start pb-1 pl-1.5 text-[10px] text-muted">
          {gmtOffsetLabel(timeZone)}
        </div>
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className="font-condensed flex-1 border-l border-border py-2 text-center"
          >
            <p className="text-[10px] font-bold tracking-[0.1em] text-muted uppercase">
              {day.toLocaleDateString("en-US", { weekday: "short" })}
            </p>
            <p
              className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-[13px] font-bold ${
                isSameDay(day, today)
                  ? "bg-[var(--copper-metal)] text-white"
                  : "text-foreground"
              }`}
            >
              {day.getDate()}
            </p>
          </div>
        ))}
      </div>

      {occurrences.some((occ) => occ.allDay) && (
        <div className="flex border-b border-border">
          <div className="w-14 shrink-0" />
          {days.map((day) => {
            const dayStart = startOfDay(day);
            const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
            const allDayOccurrences = occurrences.filter(
              (occ) =>
                occ.allDay &&
                occ.occurrenceStart < dayEnd &&
                occ.occurrenceEnd > dayStart,
            );
            return (
              <div
                key={day.toISOString()}
                className="flex-1 space-y-0.5 border-l border-border p-1"
              >
                {allDayOccurrences.map((occ) => (
                  <button
                    key={occ.occurrenceKey}
                    type="button"
                    onClick={() => onEventClick(occ)}
                    className={`block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-bold text-white hover:brightness-110 ${barClass(occ.color)}`}
                    title={occ.title}
                  >
                    {occ.title}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}

      <div
        ref={scrollRef}
        className="overflow-y-auto"
        style={{ maxHeight: VIEWPORT_HEIGHT }}
      >
        <div
          className="relative flex"
          style={{ height: HOURS.length * HOUR_HEIGHT }}
        >
          <div className="w-14 shrink-0">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="relative border-t border-border/60 text-right text-[10px] text-muted"
                style={{ height: HOUR_HEIGHT }}
              >
                <span className="absolute -top-2 right-1.5 bg-surface px-0.5">
                  {hour === 0
                    ? ""
                    : new Date(2000, 0, 1, hour).toLocaleTimeString("en-US", {
                        hour: "numeric",
                      })}
                </span>
              </div>
            ))}
          </div>

          {days.map((day) => {
            const dayStart = startOfDay(day);
            const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
            const dayOccurrences = occurrences.filter(
              (occ) =>
                !occ.allDay &&
                occ.occurrenceStart < dayEnd &&
                occ.occurrenceEnd > dayStart,
            );
            const laidOut = layoutDay(dayOccurrences);

            return (
              <div
                key={day.toISOString()}
                className="relative flex-1 border-l border-border"
              >
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="border-t border-border/60"
                    style={{ height: HOUR_HEIGHT }}
                  />
                ))}
                {laidOut.map((laid) => (
                  <EventBlock
                    key={laid.occurrence.occurrenceKey}
                    laid={laid}
                    onClick={() => onEventClick(laid.occurrence)}
                    detailed={days.length === 1}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
