"use client";

import {
  addDays,
  formatTime,
  isSameDay,
  monthGridRange,
  MONTH_GRID_WEEKS,
  type CalendarOccurrence,
} from "@/lib/calendarRecurrence";
import { PIPELINE_STAGE_COLOR_CLASSES } from "@/lib/pipelineStageColors";

function dotClass(color: string): string {
  return (
    PIPELINE_STAGE_COLOR_CLASSES[
      color as keyof typeof PIPELINE_STAGE_COLOR_CLASSES
    ]?.dot ?? PIPELINE_STAGE_COLOR_CLASSES.copper.dot
  );
}

const WEEKDAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
// However many events actually fit on a line or two before the cell would
// need to grow — past this, the rest collapse into "N more" instead of
// shrinking every cell to fit its busiest day, same as Google Calendar's
// own month view.
const MAX_VISIBLE_PER_DAY = 2;

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** Groups already-expanded occurrences by calendar day, for O(1) lookup per
 *  cell instead of filtering the whole list once per grid cell. */
export function groupOccurrencesByDay(
  occurrences: CalendarOccurrence[],
): Map<string, CalendarOccurrence[]> {
  const map = new Map<string, CalendarOccurrence[]>();
  for (const occ of occurrences) {
    const key = dateKey(occ.occurrenceStart);
    const existing = map.get(key);
    if (existing) existing.push(occ);
    else map.set(key, [occ]);
  }
  return map;
}

export function MonthGrid({
  monthAnchor,
  occurrences,
  onDayClick,
  onEventClick,
  timeZone,
}: {
  monthAnchor: Date;
  occurrences: CalendarOccurrence[];
  onDayClick: (date: Date) => void;
  onEventClick: (occurrence: CalendarOccurrence) => void;
  timeZone?: string;
}) {
  const { start } = monthGridRange(monthAnchor);
  const days = Array.from({ length: MONTH_GRID_WEEKS * 7 }, (_, i) =>
    addDays(start, i),
  );
  const byDay = groupOccurrencesByDay(occurrences);
  const today = new Date();
  const monthIndex = monthAnchor.getMonth();

  return (
    <div className="grid grid-cols-7 overflow-hidden rounded-[10px] border-t border-l border-border">
      {WEEKDAY_LABELS.map((label) => (
        <div
          key={label}
          className="font-condensed border-r border-b border-border bg-surface2 py-2 text-center text-[11px] font-bold tracking-[0.1em] text-muted uppercase"
        >
          {label}
        </div>
      ))}
      {days.map((day) => {
        const dayOccurrences = byDay.get(dateKey(day)) ?? [];
        const visible = dayOccurrences.slice(0, MAX_VISIBLE_PER_DAY);
        const moreCount = dayOccurrences.length - visible.length;
        const inCurrentMonth = day.getMonth() === monthIndex;
        const isToday = isSameDay(day, today);

        return (
          <div
            key={day.toISOString()}
            className="flex min-h-[92px] flex-col gap-1 border-r border-b border-border p-1.5"
          >
            <button
              type="button"
              onClick={() => onDayClick(day)}
              className={`font-condensed self-start rounded-full px-1.5 text-[13px] font-bold transition-colors ${
                isToday
                  ? "bg-[var(--copper-metal)] text-white"
                  : inCurrentMonth
                    ? "text-foreground hover:text-white"
                    : "text-muted/50 hover:text-muted"
              }`}
            >
              {day.getDate() === 1
                ? day.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                : day.getDate()}
            </button>

            <div className="flex min-w-0 flex-col gap-0.5">
              {visible.map((occ) => (
                <button
                  key={occ.occurrenceKey}
                  type="button"
                  onClick={() => onEventClick(occ)}
                  className="flex min-w-0 items-center gap-1 text-left text-[11px] text-foreground hover:text-white"
                  title={occ.title}
                >
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass(occ.color)}`}
                  />
                  {!occ.allDay && (
                    <span className="shrink-0 text-muted">
                      {formatTime(occ.occurrenceStart, timeZone)}
                    </span>
                  )}
                  <span className="truncate">{occ.title}</span>
                </button>
              ))}
              {moreCount > 0 && (
                <button
                  type="button"
                  onClick={() => onDayClick(day)}
                  className="text-left text-[11px] text-muted hover:text-foreground"
                >
                  {moreCount} more
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
