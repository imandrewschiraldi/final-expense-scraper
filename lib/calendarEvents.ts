import { db } from "@/lib/db";
import type { CalendarEventRecord } from "@/lib/calendarRecurrence";

/** Every calendar event, raw (un-expanded) — small enough for this agency's
 *  own training schedule that there's no pagination or date-range filter
 *  here; the client expands recurring rows into visible occurrences itself
 *  (see lib/calendarRecurrence.ts) as the admin/agent navigates months. */
export async function getAllCalendarEvents(): Promise<CalendarEventRecord[]> {
  return db.calendarEvent.findMany({
    orderBy: { startAt: "asc" },
    select: {
      id: true,
      title: true,
      description: true,
      link: true,
      phoneNumber: true,
      location: true,
      startAt: true,
      endAt: true,
      recurring: true,
      recurrenceEndAt: true,
    },
  });
}

export type CalendarEventInput = {
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

export async function createCalendarEvent(
  data: CalendarEventInput,
  createdById: string,
) {
  return db.calendarEvent.create({ data: { ...data, createdById } });
}

export async function updateCalendarEvent(
  id: string,
  data: CalendarEventInput,
) {
  return db.calendarEvent.update({ where: { id }, data });
}

export async function deleteCalendarEvent(id: string) {
  return db.calendarEvent.delete({ where: { id } });
}

const MAX_TITLE = 200;
const MAX_DESCRIPTION = 2000;
const MAX_LINK = 500;
const MAX_PHONE = 40;
const MAX_LOCATION = 200;

function trimmedOrNull(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, max);
  return trimmed || null;
}

/** Shared by the create (POST) and update (PATCH) routes — same fields,
 *  same rules either way, since editing an event reuses the exact form
 *  that created it. */
export function parseCalendarEventInput(
  body: unknown,
): { data: CalendarEventInput } | { error: string } {
  const b = body as Record<string, unknown> | null;
  const title =
    typeof b?.title === "string" ? b.title.trim().slice(0, MAX_TITLE) : "";
  if (!title) return { error: "A title is required." };

  const startAt = typeof b?.startAt === "string" ? new Date(b.startAt) : null;
  const endAt = typeof b?.endAt === "string" ? new Date(b.endAt) : null;
  if (!startAt || Number.isNaN(startAt.getTime())) {
    return { error: "A valid start time is required." };
  }
  if (!endAt || Number.isNaN(endAt.getTime())) {
    return { error: "A valid end time is required." };
  }
  if (endAt <= startAt) {
    return { error: "End time must be after the start time." };
  }

  const recurring = b?.recurring === true;
  let recurrenceEndAt: Date | null = null;
  if (
    recurring &&
    typeof b?.recurrenceEndAt === "string" &&
    b.recurrenceEndAt
  ) {
    const parsed = new Date(b.recurrenceEndAt);
    if (Number.isNaN(parsed.getTime())) {
      return { error: "Recurrence end date isn't valid." };
    }
    recurrenceEndAt = parsed;
  }

  return {
    data: {
      title,
      description: trimmedOrNull(b?.description, MAX_DESCRIPTION),
      link: trimmedOrNull(b?.link, MAX_LINK),
      phoneNumber: trimmedOrNull(b?.phoneNumber, MAX_PHONE),
      location: trimmedOrNull(b?.location, MAX_LOCATION),
      startAt,
      endAt,
      recurring,
      recurrenceEndAt,
    },
  };
}
