import { db } from "@/lib/db";
import { F90AdminPanel } from "@/components/admin/F90AdminPanel";
import { getAgencySettings } from "@/lib/agencySettings";

export const dynamic = "force-dynamic";

export default async function AdminF90Page() {
  const [agents, settings] = await Promise.all([
    db.user.findMany({
      where: { role: { in: ["AGENT", "ADMIN"] }, active: true },
      select: {
        id: true,
        name: true,
        email: true,
        f90EnrolledAt: true,
        f90CompletedSteps: true,
      },
      orderBy: { name: "asc" },
    }),
    getAgencySettings(),
  ]);

  return (
    <div>
      <h1 className="font-condensed mb-10 text-2xl font-extrabold tracking-wide text-foreground uppercase">
        F90 — First 90 Days
      </h1>
      <F90AdminPanel
        initialAgents={agents.map((a) => ({
          ...a,
          f90EnrolledAt: a.f90EnrolledAt ? a.f90EnrolledAt.toISOString() : null,
        }))}
        initialSignatureName={settings.f90SignatureName}
      />
    </div>
  );
}
