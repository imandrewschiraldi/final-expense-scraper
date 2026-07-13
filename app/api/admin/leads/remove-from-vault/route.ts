import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { isLeadType } from "@/lib/leadType";
import { Prisma } from "@prisma/client";

// Pulls leads back out of the shared vault into the regular unassigned
// pool, clearing vaultOrigin too so they behave as ordinary leads going
// forward (normal 8-week recycle rules instead of the vault's).
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const body = await req.json().catch(() => ({}));
  const { ids, state, leadType } = body as { ids?: string[]; state?: string; leadType?: string };

  if ((!ids || ids.length === 0) && !state && !leadType) {
    return NextResponse.json({ error: "No leads specified to remove from vault" }, { status: 400 });
  }

  const where: Prisma.LeadWhereInput = { isVaulted: true };
  if (ids && ids.length > 0) {
    where.id = { in: ids };
  } else {
    if (state) where.state = state;
    if (leadType && isLeadType(leadType)) where.leadType = leadType;
  }

  const result = await db.lead.updateMany({
    where,
    data: { isVaulted: false, vaultOrigin: false },
  });

  return NextResponse.json({ removed: result.count });
}
