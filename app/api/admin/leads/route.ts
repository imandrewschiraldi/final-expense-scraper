import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { LEAD_STATUSES, LeadStatus } from "@/lib/leadStatus";
import { Prisma } from "@prisma/client";

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { searchParams } = new URL(req.url);
  const state = searchParams.get("state");
  const status = searchParams.get("status") as LeadStatus | null;
  const agentId = searchParams.get("agentId");
  const unassignedOnly = searchParams.get("unassignedOnly") === "true";
  const archived = searchParams.get("archived") === "true";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));

  const where: Prisma.LeadWhereInput = { isArchived: archived };

  if (state) where.state = state;
  if (status && LEAD_STATUSES.includes(status)) where.status = status;
  if (unassignedOnly) where.assignedAgentId = null;
  else if (agentId) where.assignedAgentId = agentId;

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
