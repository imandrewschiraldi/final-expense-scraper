import { NextRequest, NextResponse } from "next/server";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from "date-fns";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { LeadStatus } from "@/lib/leadStatus";

const TRACKED_STATUSES: LeadStatus[] = ["CONTACTED", "SOLD", "NOT_INTERESTED", "APPOINTMENT_BOOKING"];

function getRange(period: string, now: Date) {
  switch (period) {
    case "day":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "month":
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case "year":
      return { from: startOfYear(now), to: endOfYear(now) };
    case "week":
    default:
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
  }
}

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") ?? "week";
  const state = searchParams.get("state");
  const agentId = searchParams.get("agentId");

  const { from, to } = getRange(period, new Date());

  const where = {
    status: { in: TRACKED_STATUSES },
    updatedAt: { gte: from, lte: to },
    ...(state ? { state } : {}),
    ...(agentId ? { assignedAgentId: agentId } : {}),
  };

  const grouped = await db.lead.groupBy({
    by: ["status"],
    where,
    _count: true,
  });

  const totals: Record<string, number> = {
    CONTACTED: 0,
    SOLD: 0,
    NOT_INTERESTED: 0,
    APPOINTMENT_BOOKING: 0,
  };
  grouped.forEach((g) => {
    totals[g.status] = g._count;
  });

  const byAgentGrouped = await db.lead.groupBy({
    by: ["assignedAgentId", "status"],
    where: { ...where, assignedAgentId: { not: null } },
    _count: true,
  });

  const agentIds = [...new Set(byAgentGrouped.map((g) => g.assignedAgentId).filter(Boolean))] as string[];
  const agents = await db.user.findMany({
    where: { id: { in: agentIds } },
    select: { id: true, name: true },
  });
  const agentNameById = new Map(agents.map((a) => [a.id, a.name]));

  type AgentTotals = { agentId: string; agentName: string } & Record<LeadStatus, number>;
  const byAgentMap = new Map<string, AgentTotals>();
  byAgentGrouped.forEach((g) => {
    const id = g.assignedAgentId as string;
    if (!byAgentMap.has(id)) {
      byAgentMap.set(id, {
        agentId: id,
        agentName: agentNameById.get(id) ?? "Unknown",
        NEW: 0,
        CONTACTED: 0,
        NO_ANSWER: 0,
        SOLD: 0,
        NOT_INTERESTED: 0,
        APPOINTMENT_BOOKING: 0,
      });
    }
    byAgentMap.get(id)![g.status] = g._count;
  });

  return NextResponse.json({
    range: { from, to },
    totals,
    byAgent: [...byAgentMap.values()],
  });
}
