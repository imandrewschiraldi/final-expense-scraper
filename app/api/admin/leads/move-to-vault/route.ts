import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { isLeadType } from "@/lib/leadType";
import { Prisma } from "@prisma/client";

// Moves already-imported leads into the shared vault pool. Only ever
// touches unassigned leads — an agent actively working a lead should
// never have it pulled into the vault out from under them.
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const body = await req.json().catch(() => ({}));
  const { ids, state, leadType } = body as { ids?: string[]; state?: string; leadType?: string };

  if ((!ids || ids.length === 0) && !state && !leadType) {
    return NextResponse.json({ error: "No leads specified to move" }, { status: 400 });
  }

  const where: Prisma.LeadWhereInput = { assignedAgentId: null, isVaulted: false };
  if (ids && ids.length > 0) {
    where.id = { in: ids };
  } else {
    if (state) where.state = state;
    if (leadType && isLeadType(leadType)) where.leadType = leadType;
  }

  const result = await db.lead.updateMany({
    where,
    data: { isVaulted: true, vaultOrigin: true },
  });

  return NextResponse.json({ moved: result.count });
}
