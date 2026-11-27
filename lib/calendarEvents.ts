import { db } from "@/lib/db";
import {
  RECURRENCE_RULES,
  type CalendarEventRecord,
  type RecurrenceRule,
} from "@/lib/calendarRecurrence";
import { isPipelineStageColorToken } from "@/lib/pipelineStageColors";
import type { Prisma } from "@prisma/client";

const SELECT = {
  id: true,
  title: true,
  description: true,
  link: true,
  phoneNumber: true,
  location: true,
  startAt: true,
  endAt: true,
  allDay: true,
  color: true,
  scope: true,
  ownerId: true,
  recurrenceRule: true,
  recurrenceEndAt: true,
} satisfies Prisma.CalendarEventSelect;

/** Every event a given user can see on their own calendar — every AGENCY
 *  event (admin-created, agency-wide: training, company events) plus this
 *  user's own PERSONAL ones (their own additions, and anything Book of
 *  Business created for them automatically — an appointment, a policy's
 *  follow-up, an Annual Review). Never another agent's personal events.
 *  Small enough for this agency's own schedule that there's no pagination
 *  or date-range filter here; the client expands a recurring row into
 *  visible occurrences itself (see lib/calendarRecurrence.ts) as the viewer
 *  navigates months. */
export async function getCalendarEventsForUser(
  userId: string,
): Promise<CalendarEventRecord[]> {
  const events = await db.calendarEvent.findMany({
    where: { OR: [{ scope: "AGENCY" }, { ownerId: userId }] },
    orderBy: { startAt: "asc" },
    select: SELECT,
  });
  return events as CalendarEventRecord[];
}

export type CalendarEventInput = {
  title: string;
  description: string | null;
  link: string | null;
  phoneNumber: string | null;
  location: string | null;
  startAt: Date;
  endAt: Date;
  allDay: boolean;
  color: string;
  recurrenceRule: RecurrenceRule | null;
  recurrenceEndAt: Date | null;
};

/** An admin-created event — always agency-wide (visible to everyone),
 *  same as this feature's only mode before PERSONAL events existed. */
export async function createAgencyCalendarEvent(
  data: CalendarEventInput,
  createdById: string,
) {
  return db.calendarEvent.create({
    data: { ...data, scope: "AGENCY", createdById },
  });
}

/** An agent's own event — visible only to them. Also how Book of Business
 *  creates an appointment/follow-up/Annual-Review reminder on an agent's
 *  calendar; `leadId`/`policyId` are only ever set by that server-side code,
 *  never accepted from a manual create-event form. */
export async function createPersonalCalendarEvent(
  data: CalendarEventInput,
  ownerId: string,
  links?: { leadId?: string; policyId?: string },
) {
  return db.calendarEvent.create({
    data: {
      ...data,
      scope: "PERSONAL",
      ownerId,
      createdById: ownerId,
      leadId: links?.leadId,
      policyId: links?.policyId,
    },
  });
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

/** Upserts the one calendar event linked to a given Lead/Policy by a given
 *  "kind" tag in its own bookkeeping — used so re-saving a follow-up date
 *  or re-booking an appointment updates the existing reminder instead of
 *  piling up duplicates. There's no separate "kind" column (see
 *  lib/calendarEvents.ts' CalendarEvent model note) — a policy only ever
 *  has one follow-up and one Annual Review event, a lead only one
 *  appointment, so (ownerId, leadId/policyId, title-prefix) is enough to
 *  find the right row to replace. */
async function upsertLinkedPersonalEvent(params: {
  ownerId: string;
  leadId?: string;
  policyId?: string;
  titlePrefix: string;
  data: CalendarEventInput;
}) {
  const { ownerId, leadId, policyId, titlePrefix, data } = params;
  const existing = await db.calendarEvent.findFirst({
    where: {
      ownerId,
      ...(leadId ? { leadId } : {}),
      ...(policyId ? { policyId } : {}),
      title: { startsWith: titlePrefix },
    },
    select: { id: true },
  });

  if (existing) {
    return db.calendarEvent.update({ where: { id: existing.id }, data });
  }
  return createPersonalCalendarEvent(data, ownerId, { leadId, policyId });
}

/** Books (or re-books) an appointment on the owning agent's calendar for a
 *  Lead that was just moved to the Appointment Booked stage. */
export async function upsertAppointmentEvent(params: {
  ownerId: string;
  leadId: string;
  contactName: string;
  startAt: Date;
  endAt: Date;
}) {
  return upsertLinkedPersonalEvent({
    ownerId: params.ownerId,
    leadId: params.leadId,
    titlePrefix: "Appointment:",
    data: {
      title: `Appointment: ${params.contactName}`,
      description: null,
      link: null,
      phoneNumber: null,
      location: null,
      startAt: params.startAt,
      endAt: params.endAt,
      allDay: false,
      color: "teal",
      recurrenceRule: null,
      recurrenceEndAt: null,
    },
  });
}

/** Mirrors a Policy's own followUpAt onto the owning agent's calendar as an
 *  all-day reminder — called whenever followUpAt is set via PolicyEditForm.
 *  Clearing followUpAt removes the event instead (see
 *  removeLinkedPolicyEvent). */
export async function upsertFollowUpEvent(params: {
  ownerId: string;
  policyId: string;
  clientName: string;
  followUpAt: Date;
}) {
  const start = new Date(params.followUpAt);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return upsertLinkedPersonalEvent({
    ownerId: params.ownerId,
    policyId: params.policyId,
    titlePrefix: "Follow Up:",
    data: {
      title: `Follow Up: ${params.clientName}`,
      description: null,
      link: null,
      phoneNumber: null,
      location: null,
      startAt: start,
      endAt: end,
      allDay: true,
      color: "gold",
      recurrenceRule: null,
      recurrenceEndAt: null,
    },
  });
}

/** Creates the one-year-out Annual Review reminder when a policy is first
 *  submitted — a flat +365 days from submittedAt, all-day. */
export async function createAnnualReviewEvent(params: {
  ownerId: string;
  policyId: string;
  clientName: string;
  submittedAt: Date;
}) {
  const start = new Date(params.submittedAt);
  start.setFullYear(start.getFullYear() + 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return createPersonalCalendarEvent(
    {
      title: `Annual Review: ${params.clientName}`,
      description: null,
      link: null,
      phoneNumber: null,
      location: null,
      startAt: start,
      endAt: end,
      allDay: true,
      color: "amber",
      recurrenceRule: null,
      recurrenceEndAt: null,
    },
    params.ownerId,
    { policyId: params.policyId },
  );
}

/** Deletes whatever follow-up reminder is linked to a policy — called when
 *  followUpAt is cleared, so the calendar doesn't keep a stale reminder
 *  around for a date the agent no longer cares about. */
export async function removeFollowUpEvent(policyId: string) {
  await db.calendarEvent.deleteMany({
    where: { policyId, title: { startsWith: "Follow Up:" } },
  });
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

/** Shared by every create/edit form (admin's agency events, an agent's own
 *  personal ones) — same fields, same rules either way. */
export function parseCalendarEventInput(
  body: unknown,
): { data: CalendarEventInput } | { error: string } {
  const b = body as Record<string, unknown> | null;
  const title =
    typeof b?.title === "string" ? b.title.trim().slice(0, MAX_TITLE) : "";
  if (!title) return { error: "A title is required." };

  const allDay = b?.allDay === true;
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

  const color =
    typeof b?.color === "string" && isPipelineStageColorToken(b.color)
      ? b.color
      : "copper";

  let recurrenceRule: RecurrenceRule | null = null;
  if (
    typeof b?.recurrenceRule === "string" &&
    (RECURRENCE_RULES as string[]).includes(b.recurrenceRule)
  ) {
    recurrenceRule = b.recurrenceRule as RecurrenceRule;
  }

  let recurrenceEndAt: Date | null = null;
  if (
    recurrenceRule &&
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
      allDay,
      color,
      recurrenceRule,
      recurrenceEndAt,
    },
  };
}
