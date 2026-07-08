import { startOfWeek } from "date-fns";
import { db } from "@/lib/db";

export const WEEKLY_LEADS_PER_AGENT = 300;

// Agents only receive new-lead batches for their first 6 weeks. After that,
// the weekly cron skips them entirely (they keep everything already
// assigned — this only stops the flow of brand-new leads).
export const NEW_LEAD_ASSIGNMENT_WEEKS = 6;

// A lead that's been sitting with an agent for 8 weeks without being sold
// or marked not interested gets recycled back into the unassigned pool so
// it can go to someone else. The clock is per-lead, based on when it was
// assigned, not per-agent.
export const LEAD_RECYCLE_WEEKS = 8;

// Cap on how many recycled candidates we pull into memory before shuffling
// — keeps this cheap even if the recycled pool grows into the tens of
// thousands.
const RECYCLE_CANDIDATE_CAP = 5000;

export function getMondayOf(date: Date) {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function hasNewLeadEligibility(agentCreatedAt: Date, now: Date = new Date()) {
  const msSinceCreation = now.getTime() - agentCreatedAt.getTime();
  return msSinceCreation < NEW_LEAD_ASSIGNMENT_WEEKS * 7 * 24 * 60 * 60 * 1000;
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Releases leads that have sat with an agent for LEAD_RECYCLE_WEEKS without
 * being sold or marked not interested — sends them back to the unassigned
 * pool as "recycled" so the weekly cron can hand them to a new agent once
 * the fresh (never-assigned) pool runs dry. Vault-origin leads are excluded
 * since they already have their own 14-day revert-to-vault cycle.
 */
export async function recycleStaleAssignedLeads() {
  const cutoff = new Date(Date.now() - LEAD_RECYCLE_WEEKS * 7 * 24 * 60 * 60 * 1000);

  const result = await db.lead.updateMany({
    where: {
      assignedAgentId: { not: null },
      isArchived: false,
      vaultOrigin: false,
      assignedAt: { lt: cutoff },
    },
    data: {
      assignedAgentId: null,
      assignedAt: null,
      status: "NEW",
      wasRecycled: true,
    },
  });

  return { recycled: result.count };
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
  const now = new Date();

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

    if (!hasNewLeadEligibility(agent.createdAt, now)) {
      await db.assignmentRunFlag.create({
        data: {
          assignmentRunId: assignmentRun.id,
          agentId: agent.id,
          reason: "new_lead_eligibility_expired",
          leadsAssigned: 0,
        },
      });
      results.push({ agentId: agent.id, agentName: agent.name, assigned: 0, flagged: true });
      continue;
    }

    const assignedCount = await db.$transaction(async (tx) => {
      // Fresh (never-assigned) leads go out first, oldest first — only once
      // those run dry do we dip into the recycled pool, handed out in
      // random order rather than by age.
      const freshLeads = await tx.lead.findMany({
        where: {
          assignedAgentId: null,
          isArchived: false,
          isVaulted: false,
          wasRecycled: false,
          state: { in: agent.licensedStates },
        },
        orderBy: { createdAt: "asc" },
        take: WEEKLY_LEADS_PER_AGENT,
        select: { id: true },
      });

      let ids = freshLeads.map((l) => l.id);

      if (ids.length < WEEKLY_LEADS_PER_AGENT) {
        const remaining = WEEKLY_LEADS_PER_AGENT - ids.length;
        const recycledCandidates = await tx.lead.findMany({
          where: {
            assignedAgentId: null,
            isArchived: false,
            isVaulted: false,
            wasRecycled: true,
            state: { in: agent.licensedStates },
          },
          take: RECYCLE_CANDIDATE_CAP,
          select: { id: true },
        });
        ids = ids.concat(shuffle(recycledCandidates.map((l) => l.id)).slice(0, remaining));
      }

      if (ids.length === 0) {
        return 0;
      }

      await tx.lead.updateMany({
        where: { id: { in: ids } },
        data: { assignedAgentId: agent.id, assignedAt: new Date() },
      });

      await tx.notification.create({
        data: {
          userId: agent.id,
          type: "LEADS_ASSIGNED",
          payload: { count: ids.length, weekOf: mondayOf.toISOString() },
        },
      });

      return ids.length;
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
