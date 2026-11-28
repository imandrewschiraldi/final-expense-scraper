import { db } from "@/lib/db";
import { F90AdminPanel } from "@/components/admin/F90AdminPanel";
import { F90MissionContentPanel } from "@/components/admin/F90MissionContentPanel";
import { getAgencySettings } from "@/lib/agencySettings";
import { F90_PHASES, type F90Link } from "@/lib/f90Content";

export const dynamic = "force-dynamic";

export default async function AdminF90Page() {
  const [agents, settings, contentOverrides] = await Promise.all([
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
    db.f90StepContent.findMany(),
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

      <h2 className="font-condensed mt-12 mb-4 text-lg font-extrabold tracking-wide text-foreground uppercase">
        Mission Content
      </h2>
      <F90MissionContentPanel
        phases={F90_PHASES}
        initialOverrides={contentOverrides.map((o) => ({
          stepKey: o.stepKey,
          title: o.title,
          description: o.description,
          videoUrl: o.videoUrl,
          links: Array.isArray(o.links) ? (o.links as unknown as F90Link[]) : null,
        }))}
      />
    </div>
  );
}
