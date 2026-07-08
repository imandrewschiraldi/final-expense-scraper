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
    ? await db.user.findUnique({ where: { id: session.user.id }, select: { createdAt: true } })
    : null;

  if (!agent || !hasVaultAccess(agent.createdAt)) {
    redirect("/agent/dashboard");
  }

  // If another agent claimed this lead moments ago it's no longer vaulted
  // and this 404s — an acceptable edge case for a shared pool.
  const lead = await db.lead.findFirst({
    where: { id, isVaulted: true },
    include: { notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } } },
  });

  if (!lead) {
    notFound();
  }

  const where = { isVaulted: true, ...(filters.state ? { state: filters.state } : {}) };
  const siblingIds = await db.lead.findMany({
    where,
    orderBy: { createdAt: "asc" as const },
    select: { id: true },
  });

  const ids = siblingIds.map((l) => l.id);
  const currentIndex = ids.indexOf(id);
  const prevId = currentIndex > 0 ? ids[currentIndex - 1] : null;
  const nextId = currentIndex >= 0 && currentIndex < ids.length - 1 ? ids[currentIndex + 1] : null;

  const filterQuery = new URLSearchParams(filters.state ? { state: filters.state } : {}).toString();

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
      basePath="/agent/vault"
      backHref="/agent/vault"
      backLabel="Back to Vault"
    />
  );
}
