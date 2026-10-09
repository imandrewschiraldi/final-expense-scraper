import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasVaultAccess } from "@/lib/vault";
import { LeadDetailPanel } from "@/components/agent/LeadDetailPanel";

export const dynamic = "force-dynamic";

export default async function VaultLeadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ state?: string }>;
}) {
  const { id } = await params;
  const filters = await searchParams;

  const session = await auth();
  const agent = session?.user.id
    ? await db.user.findUnique({
        where: { id: session.user.id },
        select: { createdAt: true, vaultEnabled: true, vaultAccessStartedAt: true },
      })
    : null;

  if (!agent || !hasVaultAccess(agent)) {
    redirect("/agent/dashboard");
  }

  // If another agent claimed this lead moments ago it's no longer vaulted
  // and this 404s — an acceptable edge case for a shared pool.
  const lead = await db.lead.findFirst({
    where: { id, isVaulted: true },
    include: {
      notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
      contactLogEntries: { orderBy: { createdAt: "desc" }, include: { agent: { select: { name: true } } } },
    },
  });

  if (!lead) {
    notFound();
  }

  const where = { isVaulted: true, ...(filters.state ? { state: filters.state } : {}) };
  // The vault can run to 100K+ leads, so Prev/Next and the "N of total"
  // counter are computed with targeted indexed queries (see the
  // isVaulted+createdAt index) rather than fetching every sibling id and
  // scanning for this one's position — that used to mean a full-table
  // fetch on every single Prev/Next click.
  const earlierWhere = {
    ...where,
    OR: [{ createdAt: { lt: lead.createdAt } }, { createdAt: lead.createdAt, id: { lt: lead.id } }],
  };
  const laterWhere = {
    ...where,
    OR: [{ createdAt: { gt: lead.createdAt } }, { createdAt: lead.createdAt, id: { gt: lead.id } }],
  };
  const [total, rank, prevLead, nextLead] = await Promise.all([
    db.lead.count({ where }),
    db.lead.count({ where: earlierWhere }),
    db.lead.findFirst({ where: earlierWhere, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { id: true } }),
    db.lead.findFirst({ where: laterWhere, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { id: true } }),
  ]);
  const prevId = prevLead?.id ?? null;
  const nextId = nextLead?.id ?? null;

  const filterQuery = new URLSearchParams(filters.state ? { state: filters.state } : {}).toString();

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
      basePath="/agent/vault"
      backHref="/agent/vault"
      backLabel="Back to Vault"
    />
  );
}
