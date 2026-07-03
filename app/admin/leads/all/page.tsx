import { AllLeadsPanel } from "@/components/admin/AllLeadsPanel";

export const dynamic = "force-dynamic";

export default function AllLeadsPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold tracking-wide text-white uppercase">All Leads</h1>
      <AllLeadsPanel />
    </div>
  );
}
