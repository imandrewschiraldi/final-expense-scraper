import { Prisma } from "@prisma/client";
import { LEAD_STATUSES, LeadStatus } from "@/lib/leadStatus";

export function buildAgentLeadsWhere(
  agentId: string,
  filters: {
    status?: string | null;
    // The dynamic Lead-phase PipelineStage a caller filtered to, plus its
    // systemKey (resolved by the route via lib/pipelineSync's
    // getStageTarget, since that needs a DB lookup this helper itself
    // shouldn't own). A stage with a systemKey also matches any
    // not-yet-migrated lead whose pipelineStageId is still null but whose
    // legacy `status` already equals it — the same dual-match the stage-
    // change PATCH route already keeps in sync, applied here to reads too
    // so a tab never silently hides pre-migration leads.
    pipelineStageId?: string | null;
    pipelineStageSystemKey?: string | null;
    archived?: boolean;
    state?: string | null;
    q?: string | null;
    // Contacts page "Smart List"/filter-drawer additions — all optional,
    // so every existing caller (Book of Business's contact search, the
    // plain tab-filtered list) keeps working unchanged.
    tags?: string[] | null;
    source?: string | null;
  },
): Prisma.LeadWhereInput {
  const status = filters.status as LeadStatus | null | undefined;
  const q = filters.q?.trim();

  let stageFilter: Prisma.LeadWhereInput = {};
  if (filters.pipelineStageId) {
    stageFilter = filters.pipelineStageSystemKey
      ? {
          OR: [
            { pipelineStageId: filters.pipelineStageId },
            {
              pipelineStageId: null,
              status: filters.pipelineStageSystemKey as LeadStatus,
            },
          ],
        }
      : { pipelineStageId: filters.pipelineStageId };
  } else if (status && LEAD_STATUSES.includes(status)) {
    stageFilter = { status };
  }

  return {
    assignedAgentId: agentId,
    isArchived: filters.archived ?? false,
    ...stageFilter,
    ...(filters.state ? { state: filters.state } : {}),
    ...(filters.tags && filters.tags.length > 0 ? { tags: { hasSome: filters.tags } } : {}),
    ...(filters.source ? { source: filters.source } : {}),
    // Book of Business's "Add Opportunity" contact search matches name
    // only; the Contacts page's live search also matches phone/email —
    // both share this one helper, so phone/email just add more OR branches
    // a name-only caller never populates fields for anyway. The phone
    // branch only runs when the query has digits in it — an empty
    // `contains: ""` matches every row, which would silently turn a
    // pure-letters name search into "match everything".
    ...(q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            ...(q.replace(/[^\d]/g, "") ? [{ phone: { contains: q.replace(/[^\d]/g, "") } }] : []),
          ],
        }
      : {}),
  };
}

export const AGENT_LEADS_ORDER_BY: Prisma.LeadOrderByWithRelationInput = {
  assignedAt: "desc",
};
