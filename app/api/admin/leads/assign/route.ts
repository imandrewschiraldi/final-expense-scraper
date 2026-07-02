import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { batchAssignByFilter, batchAssignLeads } from "@/lib/assignment";

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const body = await req.json();
  const { leadIds, agentId, state, count } = body as {
    leadIds?: string[];
    agentId?: string;
    state?: string;
    count?: number;
  };

  if (!agentId) {
    return NextResponse.json({ error: "agentId is required" }, { status: 400 });
  }

  try {
    if (Array.isArray(leadIds) && leadIds.length > 0) {
      const result = await batchAssignLeads(leadIds, agentId);
      return NextResponse.json(result);
    }

    if (state && count && count > 0) {
      const result = await batchAssignByFilter(state, agentId, count);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "Provide either leadIds, or state and count" },
      { status: 400 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Assignment failed" },
      { status: 400 },
    );
  }
}
