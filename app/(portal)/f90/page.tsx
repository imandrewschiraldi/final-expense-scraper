import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { F90Panel } from "@/components/portal/F90Panel";

export const dynamic = "force-dynamic";

// Not shown in the sidebar (and not meaningfully usable) for anyone the
// admin hasn't enrolled — redirected away the same way Recruiting Radar's
// page guards its own opt-in feature.
export default async function F90Page() {
  const session = await auth();
  if (!session) redirect("/login");

  const [user, salesCount, issuedPolicies] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, f90EnrolledAt: true, f90CompletedSteps: true },
    }),
    // Every Policy row is a closed sale (created at submission, not just
    // once issued) — matches the SOP's own "5 closed sales" wording for
    // unlocking Phase 5, distinct from the $20,000 Issued AP graduation
    // standard, which is about issued premium specifically.
    db.policy.count({ where: { agentId: session.user.id } }),
    db.policy.findMany({
      where: { agentId: session.user.id, status: "ISSUED" },
      select: { annualPremium: true },
    }),
  ]);

  if (!user?.f90EnrolledAt) {
    redirect("/overview");
  }

  const issuedAP = issuedPolicies.reduce(
    (sum, p) => sum + Number(p.annualPremium),
    0,
  );

  return (
    <div className="pt-10 lg:pt-24">
      <F90Panel
        agentName={user.name}
        enrolledAt={user.f90EnrolledAt.toISOString()}
        initialCompletedSteps={user.f90CompletedSteps}
        salesCount={salesCount}
        issuedAP={issuedAP}
      />
    </div>
  );
}
