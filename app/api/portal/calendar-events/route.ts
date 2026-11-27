import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/apiAuth";
import {
  createPersonalCalendarEvent,
  getCalendarEventsForUser,
  parseCalendarEventInput,
} from "@/lib/calendarEvents";

/** Read side for the Calendar page (and the Overview widget) — every AGENCY
 *  event plus the viewer's own PERSONAL ones. Raw rows, not expanded
 *  occurrences: the client expands a recurring row into whatever dates are
 *  actually in view itself (see lib/calendarRecurrence.ts), so navigating
 *  between months needs no further round-trip here. */
export async function GET() {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const events = await getCalendarEventsForUser(guard.session.user.id);
  return NextResponse.json({ events });
}

/** Any role can add their own personal event — visible only to them.
 *  Agency-wide events stay admin-only (see /api/admin/calendar-events). */
export async function POST(req: NextRequest) {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const body = await req.json().catch(() => null);
  const parsed = parseCalendarEventInput(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const event = await createPersonalCalendarEvent(
    parsed.data,
    guard.session.user.id,
  );
  return NextResponse.json({ event });
}
