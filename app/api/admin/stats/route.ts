import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { getAdminStats, StatsPeriod } from "@/lib/stats";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { searchParams } = new URL(req.url);
  const period = (searchParams.get("period") ?? "week") as StatsPeriod;
  const state = searchParams.get("state");
  const agentId = searchParams.get("agentId");

  const stats = await getAdminStats({ period, state, agentId });
  return NextResponse.json(stats);
}
