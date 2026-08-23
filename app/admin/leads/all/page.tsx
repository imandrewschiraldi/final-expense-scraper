import { db } from "@/lib/db";
import { AllLeadsPanel } from "@/components/admin/AllLeadsPanel";
import { PageHeading } from "@/components/portal/PageHeading";

export const dynamic = "force-dynamic";

export default async function AllLeadsPage() {
  const totalLeads = await db.lead.count();

  return (
    <div>
      <PageHeading slug="all-leads" alt="All Leads" />
      <p className="-mt-4 mb-6 text-center text-sm text-muted">{totalLeads.toLocaleString()} total leads</p>
      <AllLeadsPanel />
    </div>
  );
}
