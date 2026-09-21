import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AgencyDashboardClient } from "@/components/portal/agency/AgencyDashboardClient";

export const dynamic = "force-dynamic";

export default async function AgencyDashboardPage() {
  const session = await auth();
  const user = session?.user.id
    ? await db.user.findUnique({ where: { id: session.user.id }, select: { agencyDashboardEnabled: true } })
    : null;

  if (!user?.agencyDashboardEnabled) {
    redirect("/portal/dashboard");
  }

  return <AgencyDashboardClient />;
}
