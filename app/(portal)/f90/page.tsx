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

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { f90EnrolledAt: true, f90CompletedSteps: true },
  });

  if (!user?.f90EnrolledAt) {
    redirect("/overview");
  }

  return (
    <div className="pt-10 lg:pt-24">
      <F90Panel
        enrolledAt={user.f90EnrolledAt.toISOString()}
        initialCompletedSteps={user.f90CompletedSteps}
      />
    </div>
  );
}
