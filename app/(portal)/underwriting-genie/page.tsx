import { Suspense } from "react";
import { UnderwritingGenie } from "@/components/portal/underwriting/UnderwritingGenie";
import { PageHeading } from "@/components/portal/PageHeading";

export default function UnderwritingGeniePage() {
  return (
    <div>
      <PageHeading slug="underwriting-genie" alt="Underwriting Genie" />
      <p className="mb-5 text-sm text-muted">Enter the client&apos;s info and health conditions, then tap Run Underwriting.</p>
      {/* useSearchParams() (for the Overview quick-search tile's ?q= deep
          link) requires a Suspense boundary, or this whole route would
          opt out of static rendering. */}
      <Suspense>
        <UnderwritingGenie />
      </Suspense>
    </div>
  );
}
