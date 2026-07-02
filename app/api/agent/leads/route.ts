import { NextRequest, NextResponse } from "next/server";
import { requireAgent } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { LEAD_STATUSES, LeadStatus } from "@/lib/leadStatus";

export async function GET(req: NextRequest) {
  const guard = await requireAgent();
  if ("error" in guard) return guard.error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as LeadStatus | null;
  const archived = searchParams.get("archived") === "true";

  const leads = await db.lead.findMany({
    where: {
      assignedAgentId: guard.session.user.id,
      isArchived: archived,
      ...(status && LEAD_STATUSES.includes(status) ? { status } : {}),
    },
    orderBy: { assignedAt: "desc" },
  });

  return NextResponse.json({ leads });
}
