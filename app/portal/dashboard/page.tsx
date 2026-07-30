import { PersonalDashboardClient } from "@/components/portal/dashboard/PersonalDashboardClient";

export const dynamic = "force-dynamic";

export default function PortalDashboardPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[26px] font-bold text-white">Performance</h1>
        <p className="text-sm text-muted">Your production at a glance, derived from submitted policies.</p>
      </div>
      <PersonalDashboardClient />
    </div>
  );
}
