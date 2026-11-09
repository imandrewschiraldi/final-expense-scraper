import { LeadVendorsAdminPanel } from "@/components/admin/LeadVendorsAdminPanel";

export const dynamic = "force-dynamic";

export default function AdminLeadVendorsPage() {
  return (
    <div>
      <h1 className="font-condensed mb-10 text-2xl font-extrabold tracking-wide text-white uppercase">
        Lead Vendors
      </h1>
      <LeadVendorsAdminPanel />
    </div>
  );
}
