import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { F90Panel } from "@/components/portal/F90Panel";
import { F90_PHASES, f90ApplyStepOverrides, type F90Link } from "@/lib/f90Content";

export const dynamic = "force-dynamic";

// Not shown in the sidebar (and not meaningfully usable) for anyone the
// admin hasn't enrolled — redirected away the same way Recruiting Radar's
// page guards its own opt-in feature.
export default async function F90Page() {
  const session = await auth();
  if (!session) redirect("/login");

  const [user, issuedPolicies, contentOverrides] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        f90EnrolledAt: true,
        f90CompletedSteps: true,
        timeZone: true,
        f90LicenseDocUrl: true,
        f90EoDocUrl: true,
        f90AmlDocUrl: true,
      },
    }),
    db.policy.findMany({
      where: { agentId: session.user.id, status: "ISSUED" },
      select: { annualPremium: true },
    }),
    db.f90StepContent.findMany(),
  ]);

  if (!user?.f90EnrolledAt) {
    redirect("/overview");
  }

  const issuedAP = issuedPolicies.reduce(
    (sum, p) => sum + Number(p.annualPremium),
    0,
  );

  const phases = f90ApplyStepOverrides(
    F90_PHASES,
    contentOverrides.map((o) => ({
      stepKey: o.stepKey,
      title: o.title,
      description: o.description,
      videoUrl: o.videoUrl,
      links: Array.isArray(o.links) ? (o.links as unknown as F90Link[]) : null,
    })),
  );

  return (
    <div>
      <F90Panel
        agentName={user.name}
        agentTimeZone={user.timeZone}
        enrolledAt={user.f90EnrolledAt.toISOString()}
        initialCompletedSteps={user.f90CompletedSteps}
        issuedAP={issuedAP}
        initialDocUrls={{
          license: user.f90LicenseDocUrl,
          eo: user.f90EoDocUrl,
          aml: user.f90AmlDocUrl,
        }}
        phases={phases}
      />
    </div>
  );
}
