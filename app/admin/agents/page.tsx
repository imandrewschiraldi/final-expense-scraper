import { db } from "@/lib/db";
import { AgentsPanel } from "@/components/admin/AgentsPanel";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const agents = await db.user.findMany({
    where: { role: "AGENT" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      licensedStates: true,
      active: true,
      _count: { select: { assignedLeads: true } },
    },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold uppercase tracking-wide text-foreground">Agents</h1>
      <AgentsPanel
        initialAgents={agents.map((a) => ({
          id: a.id,
          name: a.name,
          email: a.email,
          licensedStates: a.licensedStates,
          active: a.active,
          leadCount: a._count.assignedLeads,
        }))}
      />
    </div>
  );
}
