import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { LeadDetailPanel } from "@/components/agent/LeadDetailPanel";

export const dynamic = "force-dynamic";

export default async function AgentLeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const lead = await db.lead.findFirst({
    where: { id, assignedAgentId: session!.user.id },
    include: { notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } } },
  });

  if (!lead) {
    notFound();
  }

  return (
    <LeadDetailPanel
      lead={{
        ...lead,
        dateOfBirth: lead.dateOfBirth.toISOString(),
        notes: lead.notes.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() })),
      }}
    />
  );
}
