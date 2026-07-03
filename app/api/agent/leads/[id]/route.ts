import { NextRequest, NextResponse } from "next/server";
import { requireAgent } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { LEAD_STATUSES, LeadStatus } from "@/lib/leadStatus";
import { computeVaultAwareStatusUpdate } from "@/lib/vault";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAgent();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const lead = await db.lead.findFirst({
    where: { id, OR: [{ assignedAgentId: guard.session.user.id }, { isVaulted: true }] },
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

  const agentId = guard.session.user.id;
  const lead = await db.lead.findFirst({ where: { id, OR: [{ assignedAgentId: agentId }, { isVaulted: true }] } });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  if (lead.isArchived) {
    return NextResponse.json({ error: "This lead is locked and can no longer be updated" }, { status: 423 });
  }

  const data = computeVaultAwareStatusUpdate(status, lead, agentId);

  // Use updateMany with the same ownership/vault condition as the read
  // above so that if another agent claims this vault lead in between, this
  // update simply matches zero rows instead of overwriting their claim.
  const result = await db.lead.updateMany({
    where: { id, OR: [{ assignedAgentId: agentId }, { isVaulted: true }] },
    data,
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "This lead was just claimed by another agent" }, { status: 409 });
  }

  const updated = await db.lead.findUniqueOrThrow({ where: { id } });

  return NextResponse.json({ lead: updated });
}
