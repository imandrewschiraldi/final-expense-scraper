import { auth } from "@/lib/auth";
import { DashboardClient } from "@/components/portal/DashboardClient";

export const dynamic = "force-dynamic";

export default async function PortalDashboardPage() {
  const session = await auth();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[26px] font-bold text-white">Performance</h1>
        <p className="text-sm text-muted">Your production at a glance, derived from submitted policies.</p>
      </div>
      <DashboardClient scope="personal" isAdmin={session?.user.role === "ADMIN"} />
    </div>
  );
}
