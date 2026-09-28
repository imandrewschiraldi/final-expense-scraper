import { CarrierResourcesGrid } from "@/components/portal/CarrierResourcesGrid";
import { PageHeading } from "@/components/portal/PageHeading";

export default function CarrierResourcesPage() {
  return (
    <div>
      <PageHeading slug="carrier-resources" alt="Carrier Resources" />
      <p className="mx-auto mb-10 max-w-2xl text-center text-sm text-muted">
        Your go-to hub for all carrier resources in one place. Access quoting tools, agent portals, underwriting
        guides, customer support contacts, and other key documents — everything you need to write business
        efficiently.
      </p>
      <CarrierResourcesGrid />
    </div>
  );
}
