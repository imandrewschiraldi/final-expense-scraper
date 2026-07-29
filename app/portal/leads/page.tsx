import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { LeadVendorsPanel } from "@/components/portal/LeadVendorsPanel";

export const dynamic = "force-dynamic";

export default async function PortalLeadsPage() {
  const session = await auth();
  const vendors = await db.leadVendor.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold tracking-wide text-white uppercase">Lead Vendors</h1>
      <LeadVendorsPanel initialVendors={vendors} isAdmin={session?.user.role === "ADMIN"} />
    </div>
  );
}
