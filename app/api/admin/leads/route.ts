import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { LEAD_STATUSES, LeadStatus } from "@/lib/leadStatus";
import { isLeadType } from "@/lib/leadType";
import { Prisma } from "@prisma/client";

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { searchParams } = new URL(req.url);
  const state = searchParams.get("state");
  const status = searchParams.get("status") as LeadStatus | null;
  const leadType = searchParams.get("leadType");
  const agentId = searchParams.get("agentId");
  const unassignedOnly = searchParams.get("unassignedOnly") === "true";
  // "true" / "false" filters to just that archive state; "any" (or omitted
  // in contexts that pass it explicitly) shows both.
  const archivedParam = searchParams.get("archived");
  const isVaultedParam = searchParams.get("isVaulted");
  const vaultOriginParam = searchParams.get("vaultOrigin");
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));

  const where: Prisma.LeadWhereInput =
    archivedParam === "any" ? {} : { isArchived: archivedParam === "true" };

  if (state) where.state = state;
  if (status && LEAD_STATUSES.includes(status)) where.status = status;
  if (leadType && isLeadType(leadType)) where.leadType = leadType;
  if (unassignedOnly) where.assignedAgentId = null;
  else if (agentId) where.assignedAgentId = agentId;
  if (isVaultedParam === "true" || isVaultedParam === "false") where.isVaulted = isVaultedParam === "true";
  if (vaultOriginParam === "true" || vaultOriginParam === "false") where.vaultOrigin = vaultOriginParam === "true";

  const [leads, total] = await Promise.all([
    db.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { assignedAgent: { select: { id: true, name: true } } },
    }),
    db.lead.count({ where }),
  ]);

  return NextResponse.json({ leads, total, page, pageSize: PAGE_SIZE });
}

export async function DELETE(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const body = await req.json().catch(() => ({}));
  const { ids, state, leadType, status, vaultOrigin } = body as {
    ids?: string[];
    state?: string;
    leadType?: string;
    status?: string;
    vaultOrigin?: boolean;
  };

  // Require at least one explicit filter — never allow a bodyless call to
  // wipe every lead in the system.
  if ((!ids || ids.length === 0) && !state && !leadType && !status && vaultOrigin === undefined) {
    return NextResponse.json({ error: "No leads specified to delete" }, { status: 400 });
  }

  const where: Prisma.LeadWhereInput = {};
  if (ids && ids.length > 0) {
    where.id = { in: ids };
  } else {
    if (state) where.state = state;
    if (leadType && isLeadType(leadType)) where.leadType = leadType;
    if (status && LEAD_STATUSES.includes(status as LeadStatus)) where.status = status as LeadStatus;
    if (vaultOrigin !== undefined) where.vaultOrigin = vaultOrigin;
  }

  const result = await db.lead.deleteMany({ where });

  return NextResponse.json({ deleted: result.count });
}
