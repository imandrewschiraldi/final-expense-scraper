import { NextRequest, NextResponse } from "next/server";
import { requireAgent } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { LEAD_STATUSES, LeadStatus, isArchivedStatus } from "@/lib/leadStatus";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAgent();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const lead = await db.lead.findFirst({
    where: { id, assignedAgentId: guard.session.user.id },
    include: { notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } } },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  return NextResponse.json({ lead });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAgent();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const body = await req.json();
  const { status } = body as { status?: LeadStatus };

  if (!status || !LEAD_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const lead = await db.lead.findFirst({ where: { id, assignedAgentId: guard.session.user.id } });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  if (lead.isArchived) {
    return NextResponse.json({ error: "This lead is locked and can no longer be updated" }, { status: 423 });
  }

  const updated = await db.lead.update({
    where: { id },
    data: { status, isArchived: isArchivedStatus(status) },
  });

  return NextResponse.json({ lead: updated });
}
