import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { LEAD_STATUSES, LeadStatus } from "@/lib/leadStatus";
import { Prisma } from "@prisma/client";

// Manually sends leads back into the shared vault pool, resetting their
// status to New. Used for the admin "Not Interested" vault folder, where
// resets are a deliberate admin decision rather than the automatic
// 14-day Appointment Booked timer.
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const body = await req.json().catch(() => ({}));
  const { ids, status, vaultOrigin } = body as {
    ids?: string[];
    status?: string;
    vaultOrigin?: boolean;
  };

  if ((!ids || ids.length === 0) && !status && vaultOrigin === undefined) {
    return NextResponse.json({ error: "No leads specified to reset" }, { status: 400 });
  }

  const where: Prisma.LeadWhereInput = {};
  if (ids && ids.length > 0) {
    where.id = { in: ids };
  } else {
    if (status && LEAD_STATUSES.includes(status as LeadStatus)) where.status = status as LeadStatus;
    if (vaultOrigin !== undefined) where.vaultOrigin = vaultOrigin;
  }

  const result = await db.lead.updateMany({
    where,
    data: {
      isVaulted: true,
      status: "NEW",
      isArchived: false,
      assignedAgentId: null,
      assignedAt: null,
    },
  });

  return NextResponse.json({ reset: result.count });
}
