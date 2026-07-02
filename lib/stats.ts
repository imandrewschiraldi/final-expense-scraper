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
import { db } from "@/lib/db";
import { LeadStatus } from "@/lib/leadStatus";

export const TRACKED_STATUSES: LeadStatus[] = [
  "CONTACTED",
  "SOLD",
  "NOT_INTERESTED",
  "APPOINTMENT_BOOKING",
];

export type StatsPeriod = "day" | "week" | "month" | "year";

export function getDateRange(period: StatsPeriod, now: Date) {
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

export type AgentTotals = { agentId: string; agentName: string } & Record<LeadStatus, number>;

export async function getAdminStats(params: {
  period: StatsPeriod;
  state?: string | null;
  agentId?: string | null;
}) {
  const { from, to } = getDateRange(params.period, new Date());

  const where = {
    status: { in: TRACKED_STATUSES },
    updatedAt: { gte: from, lte: to },
    ...(params.state ? { state: params.state } : {}),
    ...(params.agentId ? { assignedAgentId: params.agentId } : {}),
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

  return {
    range: { from, to },
    totals,
    byAgent: [...byAgentMap.values()],
  };
}
