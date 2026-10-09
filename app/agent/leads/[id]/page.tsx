import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { LeadDetailPanel } from "@/components/agent/LeadDetailPanel";
import { buildAgentLeadsWhere } from "@/lib/agentLeads";

export const dynamic = "force-dynamic";

export default async function AgentLeadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string; archived?: string }>;
}) {
  const { id } = await params;
  const filters = await searchParams;
  const session = await auth();
  const agentId = session!.user.id;

  const lead = await db.lead.findFirst({
    where: { id, assignedAgentId: agentId },
    include: {
      notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
      contactLogEntries: { orderBy: { createdAt: "desc" }, include: { agent: { select: { name: true } } } },
      sourceImport: { select: { uploadedById: true } },
    },
  });

  if (!lead) {
    notFound();
  }

  // Mirrors the Vault detail page's approach — targeted indexed queries for
  // Prev/Next/position instead of fetching every sibling id and scanning
  // for this one's spot in the list on every click.
  const where = buildAgentLeadsWhere(agentId, { status: filters.status, archived: filters.archived === "true" });
  // AGENT_LEADS_ORDER_BY is assignedAt desc, so the item "before" this one
  // (closer to the top of the list) has a LATER assignedAt, not earlier.
  const cursor = lead.assignedAt ?? lead.createdAt;
  const prevWhere = {
    ...where,
    OR: [{ assignedAt: { gt: cursor } }, { assignedAt: cursor, id: { gt: lead.id } }],
  };
  const nextWhere = {
    ...where,
    OR: [{ assignedAt: { lt: cursor } }, { assignedAt: cursor, id: { lt: lead.id } }],
  };
  const [total, rank, prevLead, nextLead] = await Promise.all([
    db.lead.count({ where }),
    db.lead.count({ where: prevWhere }),
    db.lead.findFirst({ where: prevWhere, orderBy: [{ assignedAt: "asc" }, { id: "asc" }], select: { id: true } }),
    db.lead.findFirst({ where: nextWhere, orderBy: [{ assignedAt: "desc" }, { id: "desc" }], select: { id: true } }),
  ]);
  const prevId = prevLead?.id ?? null;
  const nextId = nextLead?.id ?? null;

  const filterQuery = new URLSearchParams(
    filters.status ? { status: filters.status } : filters.archived === "true" ? { archived: "true" } : {},
  ).toString();

  return (
    <LeadDetailPanel
      lead={{
        ...lead,
        dateOfBirth: lead.dateOfBirth?.toISOString() ?? null,
        notes: lead.notes.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() })),
        contactLogEntries: lead.contactLogEntries.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })),
      }}
      navigation={{
        prevId,
        nextId,
        position: rank + 1,
        total,
        filterQuery,
      }}
      canEdit
      canDelete={lead.sourceImport?.uploadedById === agentId}
    />
  );
}
