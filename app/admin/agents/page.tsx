import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AgentsPanel } from "@/components/admin/AgentsPanel";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const session = await auth();
  const agents = await db.user.findMany({
    where: { role: { in: ["AGENT", "ADMIN"] } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      licensedStates: true,
      active: true,
      compLevel: true,
      vaultEnabled: true,
      assignmentEnabled: true,
      passwordHash: true,
      createdAt: true,
      _count: { select: { assignedLeads: true } },
    },
  });

  return (
    <div>
      <h1 className="mb-10 text-2xl font-extrabold tracking-wide text-white uppercase">Agents</h1>
      <AgentsPanel
        currentUserId={session?.user.id ?? null}
        initialAgents={agents.map((a) => ({
          id: a.id,
          name: a.name,
          email: a.email,
          role: a.role,
          licensedStates: a.licensedStates,
          active: a.active,
          compLevel: a.compLevel,
          vaultEnabled: a.vaultEnabled,
          assignmentEnabled: a.assignmentEnabled,
          inviteAccepted: a.passwordHash !== null,
          leadCount: a._count.assignedLeads,
          createdAt: a.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
