import { BuyLeadsGrid } from "@/components/portal/BuyLeadsGrid";
import { PageHeading } from "@/components/portal/PageHeading";

export default function BuyLeadsPage() {
  return (
    <div>
      <PageHeading slug="trusted-lead-vendors" alt="Trusted Lead Vendors" />
      <p className="mb-8 text-sm text-muted">
        Trusted lead sources our agents use to supplement what comes through the Vault.
      </p>
      <BuyLeadsGrid />
    </div>
  );
}
