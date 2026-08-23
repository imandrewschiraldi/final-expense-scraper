import { db } from "@/lib/db";
import { AssignPanel } from "@/components/admin/AssignPanel";
import { PageHeading } from "@/components/portal/PageHeading";

export const dynamic = "force-dynamic";

export default async function AssignLeadsPage() {
  const [stateCounts, agents] = await Promise.all([
    db.lead.groupBy({
      by: ["state"],
      where: { assignedAgentId: null, isArchived: false, isVaulted: false },
      _count: true,
      orderBy: { state: "asc" },
    }),
    db.user.findMany({
      where: { role: "AGENT", active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, licensedStates: true },
    }),
  ]);

  const stateOptions = stateCounts.map((s) => ({ state: s.state, count: s._count }));

  return (
    <div>
      <PageHeading slug="assign-leads" alt="Assign Leads" />
      <AssignPanel stateOptions={stateOptions} agents={agents} />
    </div>
  );
}
