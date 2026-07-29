import { auth } from "@/lib/auth";
import { DashboardClient } from "@/components/portal/DashboardClient";

export const dynamic = "force-dynamic";

export default async function PortalDashboardPage() {
  const session = await auth();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold tracking-wide text-white uppercase">Dashboard</h1>
      <DashboardClient scope="personal" isAdmin={session?.user.role === "ADMIN"} />
    </div>
  );
}
