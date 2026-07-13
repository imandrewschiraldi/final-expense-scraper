import { Prisma } from "@prisma/client";
import { LEAD_STATUSES, LeadStatus } from "@/lib/leadStatus";

export function buildAgentLeadsWhere(
  agentId: string,
  filters: { status?: string | null; archived?: boolean; state?: string | null },
): Prisma.LeadWhereInput {
  const status = filters.status as LeadStatus | null | undefined;

  return {
    assignedAgentId: agentId,
    isArchived: filters.archived ?? false,
    ...(status && LEAD_STATUSES.includes(status) ? { status } : {}),
    ...(filters.state ? { state: filters.state } : {}),
  };
}

export const AGENT_LEADS_ORDER_BY: Prisma.LeadOrderByWithRelationInput = { assignedAt: "desc" };
