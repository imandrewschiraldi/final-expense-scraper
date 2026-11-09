import { KpiTrackerAdminPanel } from "@/components/admin/KpiTrackerAdminPanel";

export const dynamic = "force-dynamic";

export default function AdminKpiTrackerPage() {
  return (
    <div>
      <h1 className="font-condensed mb-10 text-2xl font-extrabold tracking-wide text-white uppercase">
        KPI Tracker
      </h1>
      <KpiTrackerAdminPanel />
    </div>
  );
}
