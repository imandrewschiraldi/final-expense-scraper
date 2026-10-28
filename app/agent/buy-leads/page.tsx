import { Suspense } from "react";
import { BuyLeadsGrid } from "@/components/portal/BuyLeadsGrid";
import { PageHeading } from "@/components/portal/PageHeading";

export default function BuyLeadsPage() {
  return (
    <div>
      <PageHeading slug="trusted-lead-vendors" alt="Trusted Lead Vendors" />
      <p className="mb-8 text-sm text-muted">
        Trusted lead sources our agents use to supplement what comes through the Vault.
      </p>
      {/* BuyLeadsGrid reads ?vendor= via useSearchParams (deep link from
          global search) — Next requires that behind a Suspense boundary. */}
      <Suspense fallback={null}>
        <BuyLeadsGrid />
      </Suspense>
    </div>
  );
}
