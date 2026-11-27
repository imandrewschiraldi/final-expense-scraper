import { Prisma } from "@prisma/client";
import { LEAD_STATUSES, LeadStatus } from "@/lib/leadStatus";

export function buildAgentLeadsWhere(
  agentId: string,
  filters: {
    status?: string | null;
    archived?: boolean;
    state?: string | null;
    q?: string | null;
  },
): Prisma.LeadWhereInput {
  const status = filters.status as LeadStatus | null | undefined;
  const q = filters.q?.trim();

  return {
    assignedAgentId: agentId,
    isArchived: filters.archived ?? false,
    ...(status && LEAD_STATUSES.includes(status) ? { status } : {}),
    ...(filters.state ? { state: filters.state } : {}),
    // Book of Business's "Add Opportunity" contact search — matches first
    // or last name containing the query, case-insensitively.
    ...(q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

export const AGENT_LEADS_ORDER_BY: Prisma.LeadOrderByWithRelationInput = {
  assignedAt: "desc",
};
