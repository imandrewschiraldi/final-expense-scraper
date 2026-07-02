import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { LeadDetailPanel } from "@/components/agent/LeadDetailPanel";
import { buildAgentLeadsWhere, AGENT_LEADS_ORDER_BY } from "@/lib/agentLeads";

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
    include: { notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } } },
  });

  if (!lead) {
    notFound();
  }

  const siblingIds = await db.lead.findMany({
    where: buildAgentLeadsWhere(agentId, { status: filters.status, archived: filters.archived === "true" }),
    orderBy: AGENT_LEADS_ORDER_BY,
    select: { id: true },
  });

  const ids = siblingIds.map((l) => l.id);
  const currentIndex = ids.indexOf(id);
  const prevId = currentIndex > 0 ? ids[currentIndex - 1] : null;
  const nextId = currentIndex >= 0 && currentIndex < ids.length - 1 ? ids[currentIndex + 1] : null;

  const filterQuery = new URLSearchParams(
    filters.status ? { status: filters.status } : filters.archived === "true" ? { archived: "true" } : {},
  ).toString();

  return (
    <LeadDetailPanel
      lead={{
        ...lead,
        dateOfBirth: lead.dateOfBirth.toISOString(),
        notes: lead.notes.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() })),
      }}
      navigation={{
        prevId,
        nextId,
        position: currentIndex >= 0 ? currentIndex + 1 : null,
        total: ids.length,
        filterQuery,
      }}
    />
  );
}
