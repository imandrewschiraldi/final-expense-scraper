import { db } from "@/lib/db";
import { AssignPanel } from "@/components/admin/AssignPanel";

export const dynamic = "force-dynamic";

export default async function AssignLeadsPage() {
  const [stateCounts, agents] = await Promise.all([
    db.lead.groupBy({
      by: ["state"],
      where: { assignedAgentId: null, isArchived: false },
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
      <h1 className="mb-6 text-2xl font-semibold uppercase tracking-wide text-foreground">Assign Leads</h1>
      <AssignPanel stateOptions={stateOptions} agents={agents} />
    </div>
  );
}
