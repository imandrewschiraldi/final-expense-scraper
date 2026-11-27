import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/apiAuth";
import { getAllCalendarEvents } from "@/lib/calendarEvents";

/** Read side for the Overview page's calendar widget — every role can see
 *  it, only an admin can write to it (see /api/admin/calendar-events).
 *  Raw rows, not expanded occurrences: the widget expands a recurring row
 *  into whatever dates are actually in view itself (see
 *  lib/calendarRecurrence.ts), so navigating between months needs no
 *  further round-trip here. */
export async function GET() {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const events = await getAllCalendarEvents();
  return NextResponse.json({ events });
}
