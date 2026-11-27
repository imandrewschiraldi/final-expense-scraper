import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import {
  createAgencyCalendarEvent,
  parseCalendarEventInput,
} from "@/lib/calendarEvents";

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const body = await req.json().catch(() => null);
  const parsed = parseCalendarEventInput(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const event = await createAgencyCalendarEvent(
    parsed.data,
    guard.session.user.id,
  );
  return NextResponse.json({ event });
}
