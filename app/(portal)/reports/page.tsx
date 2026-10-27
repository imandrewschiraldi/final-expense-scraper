import { ReportsPanel } from "@/components/portal/ReportsPanel";
import { PageHeading } from "@/components/portal/PageHeading";

export default function ReportsPage() {
  return (
    <div>
      <PageHeading slug="reports" alt="Reports" />
      <ReportsPanel />
    </div>
  );
}
