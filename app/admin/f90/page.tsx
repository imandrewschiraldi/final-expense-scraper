import { db } from "@/lib/db";
import { F90AdminPanel } from "@/components/admin/F90AdminPanel";

export const dynamic = "force-dynamic";

export default async function AdminF90Page() {
  const agents = await db.user.findMany({
    where: { role: { in: ["AGENT", "ADMIN"] }, active: true },
    select: {
      id: true,
      name: true,
      email: true,
      f90EnrolledAt: true,
      f90CompletedSteps: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <h1 className="font-condensed mb-10 text-2xl font-extrabold tracking-wide text-white uppercase">
        F90 — First 90 Days
      </h1>
      <F90AdminPanel
        initialAgents={agents.map((a) => ({
          ...a,
          f90EnrolledAt: a.f90EnrolledAt ? a.f90EnrolledAt.toISOString() : null,
        }))}
      />
    </div>
  );
}
