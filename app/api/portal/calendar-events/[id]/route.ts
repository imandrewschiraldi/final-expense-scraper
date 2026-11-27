import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import {
  deleteCalendarEvent,
  parseCalendarEventInput,
  updateCalendarEvent,
} from "@/lib/calendarEvents";

/** An agent can only edit/delete their own PERSONAL event here — never an
 *  AGENCY one (those stay admin-only, see /api/admin/calendar-events) and
 *  never another agent's personal event. */
async function requireOwnPersonalEvent(id: string, userId: string) {
  const event = await db.calendarEvent.findUnique({
    where: { id },
    select: { scope: true, ownerId: true },
  });
  if (!event || event.scope !== "PERSONAL" || event.ownerId !== userId) {
    return null;
  }
  return event;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const owned = await requireOwnPersonalEvent(id, guard.session.user.id);
  if (!owned) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = parseCalendarEventInput(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const event = await updateCalendarEvent(id, parsed.data);
  return NextResponse.json({ event });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const owned = await requireOwnPersonalEvent(id, guard.session.user.id);
  if (!owned) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  await deleteCalendarEvent(id).catch(() => null);
  return NextResponse.json({ ok: true });
}
