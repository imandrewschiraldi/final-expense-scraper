import { db } from "@/lib/db";

// A lead that's been sitting with an agent for 8 weeks without being sold
// or marked not interested gets recycled back into the unassigned pool so
// it can go to someone else. The clock is per-lead, based on when it was
// assigned, not per-agent.
export const LEAD_RECYCLE_WEEKS = 8;

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
