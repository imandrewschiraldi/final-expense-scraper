import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { batchAssignLeads } from "@/lib/assignment";

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const body = await req.json();
  const { leadIds, agentId } = body as { leadIds?: string[]; agentId?: string };

  if (!Array.isArray(leadIds) || leadIds.length === 0 || !agentId) {
    return NextResponse.json({ error: "leadIds and agentId are required" }, { status: 400 });
  }

  try {
    const result = await batchAssignLeads(leadIds, agentId);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Assignment failed" },
      { status: 400 },
    );
  }
}
