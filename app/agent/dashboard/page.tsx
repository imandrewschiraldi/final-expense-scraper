import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ContactsPage } from "@/components/agent/contacts/ContactsPage";
import { PageHeading } from "@/components/portal/PageHeading";

export const dynamic = "force-dynamic";

export default async function AgentDashboardPage() {
  const session = await auth();
  const agentId = session!.user.id;

  const where = { assignedAgentId: agentId, isArchived: false };

  const [leads, total] = await Promise.all([
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
  ]);

  return (
    <div>
      <PageHeading slug="contacts" alt="Contacts" />

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
