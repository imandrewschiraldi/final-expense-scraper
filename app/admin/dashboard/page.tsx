import { db } from "@/lib/db";
import { getAdminStats, StatsPeriod } from "@/lib/stats";
import { DashboardFilters } from "@/components/admin/DashboardFilters";
import { StatCard } from "@/components/admin/StatCard";
import { AssignmentFlags } from "@/components/admin/AssignmentFlags";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; agentId?: string; state?: string }>;
}) {
  const params = await searchParams;
  const period = (params.period ?? "week") as StatsPeriod;

  const [stats, agents, assignmentRuns] = await Promise.all([
    getAdminStats({ period, state: params.state, agentId: params.agentId }),
    db.user.findMany({ where: { role: "AGENT" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.assignmentRun.findMany({
      orderBy: { weekOf: "desc" },
      take: 4,
      include: { flags: { include: { agent: { select: { id: true, name: true } } } } },
    }),
  ]);

  return (
    <div>
      <h1 className="font-condensed mb-6 text-2xl font-extrabold tracking-wide text-white uppercase">
        Master Dashboard
      </h1>

      <DashboardFilters agents={agents} />

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Contacted" value={stats.totals.CONTACTED} accent="teal" />
        <StatCard label="Appointment Booking" value={stats.totals.APPOINTMENT_BOOKING} accent="gold" />
        <StatCard label="Sold" value={stats.totals.SOLD} accent="green" />
        <StatCard label="Not Interested" value={stats.totals.NOT_INTERESTED} accent="red" />
      </div>

      <div className="mb-8">
        <AssignmentFlags runs={assignmentRuns} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>By Agent</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="font-condensed border-b border-border text-[11px] font-bold tracking-[0.1em] text-muted uppercase">
                <th className="py-2 pr-4">Agent</th>
                <th className="py-2 pr-4 text-teal-light">Contacted</th>
                <th className="py-2 pr-4 text-copper">Appt. Booking</th>
                <th className="py-2 pr-4 text-green-light">Sold</th>
                <th className="py-2 pr-4 text-red-light">Not Interested</th>
              </tr>
            </thead>
            <tbody>
              {stats.byAgent.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-muted">
                    No activity in this period yet.
                  </td>
                </tr>
              )}
              {stats.byAgent.map((row) => (
                <tr key={row.agentId} className="border-b border-border/60 hover:bg-surface2">
                  <td className="py-2 pr-4 text-white">{row.agentName}</td>
                  <td className="py-2 pr-4">{row.CONTACTED}</td>
                  <td className="py-2 pr-4">{row.APPOINTMENT_BOOKING}</td>
                  <td className="py-2 pr-4">{row.SOLD}</td>
                  <td className="py-2 pr-4">{row.NOT_INTERESTED}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
