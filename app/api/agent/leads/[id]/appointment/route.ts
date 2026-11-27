import { NextRequest, NextResponse } from "next/server";
import { requireAgent } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { upsertAppointmentEvent } from "@/lib/calendarEvents";

/** Books (or re-books) the appointment on the agent's own calendar for a
 *  lead they've just moved to the Appointment Booked stage — separate from
 *  the stage PATCH itself (see /api/agent/leads/[id]) since this is the one
 *  extra step that needs an actual date/time, which a stage change alone
 *  doesn't carry. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAgent();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const agentId = guard.session.user.id;

  const lead = await db.lead.findFirst({
    where: { id, assignedAgentId: agentId },
    select: { firstName: true, lastName: true },
  });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const startAt =
    typeof body?.startAt === "string" ? new Date(body.startAt) : null;
  const endAt = typeof body?.endAt === "string" ? new Date(body.endAt) : null;
  if (!startAt || Number.isNaN(startAt.getTime())) {
    return NextResponse.json(
      { error: "A valid start time is required." },
      { status: 400 },
    );
  }
  if (!endAt || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
    return NextResponse.json(
      { error: "A valid end time after the start time is required." },
      { status: 400 },
    );
  }

  const event = await upsertAppointmentEvent({
    ownerId: agentId,
    leadId: id,
    contactName: `${lead.firstName} ${lead.lastName}`.trim(),
    startAt,
    endAt,
  });

  return NextResponse.json({ event });
}
