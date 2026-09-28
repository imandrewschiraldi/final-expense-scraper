import { CarrierResourcesGrid } from "@/components/portal/CarrierResourcesGrid";

export default function CarrierResourcesPage() {
  return (
    <div>
      <h1 className="font-poppins mb-3 text-2xl font-extrabold tracking-wide text-white uppercase">
        Carrier Resources
      </h1>
      <p className="mx-auto mb-10 max-w-2xl text-center text-sm text-muted">
        Your go-to hub for all carrier resources in one place. Access quoting tools, agent portals, underwriting
        guides, customer support contacts, and other key documents — everything you need to write business
        efficiently.
      </p>
      <CarrierResourcesGrid />
    </div>
  );
}
