import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ContactsPage } from "@/components/agent/contacts/ContactsPage";
import { StatCard } from "@/components/admin/StatCard";
import { PageHeading } from "@/components/portal/PageHeading";

export const dynamic = "force-dynamic";

export default async function AgentDashboardPage() {
  const session = await auth();
  const agentId = session!.user.id;

  const where = { assignedAgentId: agentId, isArchived: false };

  const [leads, total, statusCounts] = await Promise.all([
    db.lead.findMany({
      where,
      orderBy: { assignedAt: "desc" },
      take: 20,
      include: {
        pipelineStage: { select: { id: true, name: true, systemKey: true } },
        tasks: { where: { completed: false }, orderBy: { dueAt: "asc" }, select: { dueAt: true } },
      },
    }),
    db.lead.count({ where }),
    db.lead.groupBy({
      by: ["status"],
      where: { assignedAgentId: agentId },
      _count: true,
    }),
  ]);

  const counts: Record<string, number> = {};
  statusCounts.forEach((c) => {
    counts[c.status] = c._count;
  });

  return (
    <div>
      <PageHeading slug="contacts" alt="Contacts" />

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="New" value={counts.NEW ?? 0} accent="copper" />
        <StatCard label="Contacted" value={counts.CONTACTED ?? 0} accent="teal" />
        <StatCard label="Appointment Booked" value={counts.APPOINTMENT_BOOKING ?? 0} accent="gold" />
        <StatCard label="Sold" value={counts.SOLD ?? 0} accent="green" />
      </div>

      <ContactsPage
        initialContacts={leads.map((l) => ({
          ...l,
          dateOfBirth: l.dateOfBirth?.toISOString() ?? null,
          createdAt: l.createdAt.toISOString(),
          updatedAt: l.updatedAt.toISOString(),
          openTaskCount: l.tasks.length,
          nextTaskDueAt: l.tasks[0]?.dueAt?.toISOString() ?? null,
        }))}
        initialTotal={total}
      />
    </div>
  );
}
