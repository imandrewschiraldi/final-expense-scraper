import { startOfWeek } from "date-fns";
import { db } from "@/lib/db";

export const WEEKLY_LEADS_PER_AGENT = 300;

export function getMondayOf(date: Date) {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export async function batchAssignLeads(leadIds: string[], agentId: string) {
  const agent = await db.user.findUnique({ where: { id: agentId } });
  if (!agent || agent.role !== "AGENT") {
    throw new Error("Agent not found");
  }

  const result = await db.$transaction(async (tx) => {
    const { count } = await tx.lead.updateMany({
      where: {
        id: { in: leadIds },
        assignedAgentId: null,
        isArchived: false,
        isVaulted: false,
      },
      data: {
        assignedAgentId: agentId,
        assignedAt: new Date(),
      },
    });

    if (count > 0) {
      await tx.notification.create({
        data: {
          userId: agentId,
          type: "LEADS_ASSIGNED",
          payload: { count },
        },
      });
    }

    return count;
  });

  return { assigned: result, requested: leadIds.length };
}

export async function batchAssignByFilter(state: string, agentId: string, count: number) {
  const agent = await db.user.findUnique({ where: { id: agentId } });
  if (!agent || agent.role !== "AGENT") {
    throw new Error("Agent not found");
  }

  const assigned = await db.$transaction(async (tx) => {
    const leads = await tx.lead.findMany({
      where: { state, assignedAgentId: null, isArchived: false, isVaulted: false },
      orderBy: { createdAt: "asc" },
      take: count,
      select: { id: true },
    });

    if (leads.length === 0) {
      return 0;
    }

    await tx.lead.updateMany({
      where: { id: { in: leads.map((l) => l.id) } },
      data: { assignedAgentId: agentId, assignedAt: new Date() },
    });

    await tx.notification.create({
      data: {
        userId: agentId,
        type: "LEADS_ASSIGNED",
        payload: { count: leads.length },
      },
    });

    return leads.length;
  });

  return { assigned, requested: count };
}

export async function runWeeklyAutoAssignment(weekOf: Date = new Date()) {
  const mondayOf = getMondayOf(weekOf);

  const assignmentRun = await db.assignmentRun.create({
    data: { weekOf: mondayOf },
  });

  const agents = await db.user.findMany({
    where: { role: "AGENT", active: true },
    orderBy: { createdAt: "asc" },
  });

  const results: {
    agentId: string;
    agentName: string;
    assigned: number;
    flagged: boolean;
  }[] = [];

  for (const agent of agents) {
    if (agent.licensedStates.length === 0) {
      await db.assignmentRunFlag.create({
        data: {
          assignmentRunId: assignmentRun.id,
          agentId: agent.id,
          reason: "no_licensed_states",
          leadsAssigned: 0,
        },
      });
      results.push({ agentId: agent.id, agentName: agent.name, assigned: 0, flagged: true });
      continue;
    }

    const assignedCount = await db.$transaction(async (tx) => {
      const availableLeads = await tx.lead.findMany({
        where: {
          assignedAgentId: null,
          isArchived: false,
          isVaulted: false,
          state: { in: agent.licensedStates },
        },
        orderBy: { createdAt: "asc" },
        take: WEEKLY_LEADS_PER_AGENT,
        select: { id: true },
      });

      if (availableLeads.length === 0) {
        return 0;
      }

      await tx.lead.updateMany({
        where: { id: { in: availableLeads.map((l) => l.id) } },
        data: { assignedAgentId: agent.id, assignedAt: new Date() },
      });

      await tx.notification.create({
        data: {
          userId: agent.id,
          type: "LEADS_ASSIGNED",
          payload: { count: availableLeads.length, weekOf: mondayOf.toISOString() },
        },
      });

      return availableLeads.length;
    });

    const flagged = assignedCount < WEEKLY_LEADS_PER_AGENT;
    if (flagged) {
      await db.assignmentRunFlag.create({
        data: {
          assignmentRunId: assignmentRun.id,
          agentId: agent.id,
          reason:
            assignedCount === 0
              ? "no_available_leads_in_licensed_states"
              : "partial_leads_available",
          leadsAssigned: assignedCount,
        },
      });
    }

    results.push({ agentId: agent.id, agentName: agent.name, assigned: assignedCount, flagged });
  }

  return { assignmentRunId: assignmentRun.id, weekOf: mondayOf, results };
}
