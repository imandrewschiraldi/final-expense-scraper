import { NextRequest, NextResponse } from "next/server";
import { requireAgent } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { buildAgentLeadsWhere, AGENT_LEADS_ORDER_BY } from "@/lib/agentLeads";

export async function GET(req: NextRequest) {
  const guard = await requireAgent();
  if ("error" in guard) return guard.error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const archived = searchParams.get("archived") === "true";

  const leads = await db.lead.findMany({
    where: buildAgentLeadsWhere(guard.session.user.id, { status, archived }),
    orderBy: AGENT_LEADS_ORDER_BY,
  });

  return NextResponse.json({ leads });
}
