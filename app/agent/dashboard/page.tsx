import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AgentLeadList } from "@/components/agent/AgentLeadList";
import { StatCard } from "@/components/admin/StatCard";

export const dynamic = "force-dynamic";

export default async function AgentDashboardPage() {
  const session = await auth();
  const agentId = session!.user.id;

  const [leads, statusCounts] = await Promise.all([
    db.lead.findMany({
      where: { assignedAgentId: agentId, isArchived: false },
      orderBy: { assignedAt: "desc" },
    }),
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
      <h1 className="mb-6 text-2xl font-semibold uppercase tracking-wide text-foreground">My Leads</h1>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="New" value={counts.NEW ?? 0} accent="copper" />
        <StatCard label="Contacted" value={counts.CONTACTED ?? 0} accent="teal" />
        <StatCard label="Appointment Booking" value={counts.APPOINTMENT_BOOKING ?? 0} accent="gold" />
        <StatCard label="Sold" value={counts.SOLD ?? 0} accent="green" />
      </div>

      <AgentLeadList
        initialLeads={leads.map((l) => ({ ...l, dateOfBirth: l.dateOfBirth.toISOString() }))}
      />
    </div>
  );
}
