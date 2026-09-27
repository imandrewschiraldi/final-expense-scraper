import { NextRequest, NextResponse } from "next/server";
import { requireAgent } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { LEAD_STATUSES, LeadStatus } from "@/lib/leadStatus";
import { computeVaultAwareStatusUpdate, agentHasVaultAccess, shouldLogContact } from "@/lib/vault";
import { Prisma } from "@prisma/client";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAgent();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const agentId = guard.session.user.id;
  const canAccessVault = await agentHasVaultAccess(agentId);
  const or: Prisma.LeadWhereInput[] = [{ assignedAgentId: agentId }];
  if (canAccessVault) or.push({ isVaulted: true });

  const lead = await db.lead.findFirst({
    where: { id, OR: or },
    include: {
      notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
      contactLogEntries: { orderBy: { createdAt: "desc" }, include: { agent: { select: { name: true } } } },
    },
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
  const { status, firstName, lastName, phone, state, dateOfBirth } = body as {
    status?: LeadStatus;
    firstName?: string;
    lastName?: string;
    phone?: string;
    state?: string;
    dateOfBirth?: string;
  };

  const isFieldEdit = firstName !== undefined || lastName !== undefined || phone !== undefined || state !== undefined || dateOfBirth !== undefined;

  if (status !== undefined && !LEAD_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  if (status === undefined && !isFieldEdit) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const agentId = guard.session.user.id;
  const canAccessVault = await agentHasVaultAccess(agentId);
  const or: Prisma.LeadWhereInput[] = [{ assignedAgentId: agentId }];
  if (canAccessVault) or.push({ isVaulted: true });

  const lead = await db.lead.findFirst({ where: { id, OR: or } });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  if (lead.isArchived) {
    return NextResponse.json({ error: "This lead is locked and can no longer be updated" }, { status: 423 });
  }

  // Editing lead details (as opposed to just changing status) is only
  // allowed on leads already assigned to this agent — never on a shared
  // Vault lead they haven't claimed yet.
  if (isFieldEdit && lead.assignedAgentId !== agentId) {
    return NextResponse.json({ error: "You can only edit details on leads assigned to you" }, { status: 403 });
  }

  const editData: Prisma.LeadUpdateManyMutationInput = {};
  if (isFieldEdit) {
    if (firstName !== undefined) {
      const trimmed = firstName.trim();
      if (!trimmed) return NextResponse.json({ error: "First name is required" }, { status: 400 });
      editData.firstName = trimmed;
    }
    if (lastName !== undefined) editData.lastName = lastName.trim();
    if (phone !== undefined) {
      const normalized = phone.replace(/[^\d+]/g, "");
      if (normalized.length < 10) {
        return NextResponse.json({ error: "A valid phone number is required" }, { status: 400 });
      }
      editData.phone = normalized;
    }
    if (state !== undefined) {
      const trimmed = state.trim().toUpperCase();
      if (!trimmed) return NextResponse.json({ error: "State is required" }, { status: 400 });
      editData.state = trimmed;
    }
    if (dateOfBirth !== undefined) {
      const parsed = new Date(dateOfBirth);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: "A valid date of birth is required" }, { status: 400 });
      }
      editData.dateOfBirth = parsed;
    }
  }

  const statusData = status !== undefined ? computeVaultAwareStatusUpdate(status, lead, agentId) : {};
  const data: Prisma.LeadUpdateManyMutationInput = { ...editData, ...statusData };

  // Use updateMany with the same ownership/vault condition as the read
  // above so that if another agent claims this vault lead in between, this
  // update simply matches zero rows instead of overwriting their claim.
  const result = await db.lead.updateMany({
    where: { id, OR: or },
    data,
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "This lead was just claimed by another agent" }, { status: 409 });
  }

  if (status !== undefined && shouldLogContact(status)) {
    await db.contactLogEntry.create({ data: { leadId: id, agentId, status } });
  }

  const updated = await db.lead.findUniqueOrThrow({
    where: { id },
    include: {
      notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
      contactLogEntries: { orderBy: { createdAt: "desc" }, include: { agent: { select: { name: true } } } },
    },
  });

  return NextResponse.json({ lead: updated });
}

/**
 * An agent can only delete a lead they personally imported themselves
 * (tracked via Lead.sourceImport.uploadedById) — never a lead that reached
 * their book through normal admin assignment or the shared vault, even
 * though both look identical in "My Leads" otherwise.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAgent();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const agentId = guard.session.user.id;

  const lead = await db.lead.findUnique({
    where: { id },
    select: { assignedAgentId: true, isArchived: true, sourceImport: { select: { uploadedById: true } } },
  });

  if (!lead || lead.assignedAgentId !== agentId) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  if (lead.sourceImport?.uploadedById !== agentId) {
    return NextResponse.json({ error: "You can only delete leads you imported yourself" }, { status: 403 });
  }

  if (lead.isArchived) {
    return NextResponse.json({ error: "This lead is locked and can no longer be deleted" }, { status: 423 });
  }

  await db.lead.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
