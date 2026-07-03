import { db } from "@/lib/db";
import { AllLeadsPanel } from "@/components/admin/AllLeadsPanel";

export const dynamic = "force-dynamic";

export default async function AllLeadsPage() {
  const totalLeads = await db.lead.count();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold tracking-wide text-white uppercase">
        All Leads <span className="text-copper">({totalLeads.toLocaleString()})</span>
      </h1>
      <AllLeadsPanel />
    </div>
  );
}
