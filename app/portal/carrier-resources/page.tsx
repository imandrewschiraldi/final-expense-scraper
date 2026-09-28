import { CarrierResourcesGrid } from "@/components/portal/CarrierResourcesGrid";

export default function CarrierResourcesPage() {
  return (
    <div>
      {/* Full-width banner directly under the header's copper line — see
          the FULL_BLEED_PREFIXES entry in ContentContainer.tsx. lg:mt-[66px]
          clears the line the same way Quoter's own full-bleed content once
          did, since PageHeader (mobile-only) contributes zero height here
          on desktop. */}
      <div className="-mx-4 mb-10 bg-copper px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-10 lg:mt-[66px] lg:px-10">
        <h1 className="text-center text-2xl font-extrabold tracking-wide text-black uppercase">Carrier Resources</h1>
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-black/80">
          Your go-to hub for all carrier resources in one place. Access quoting tools, agent portals, underwriting
          guides, customer support contacts, and other key documents — everything you need to write business
          efficiently.
        </p>
      </div>

      <div className="mx-auto w-full max-w-6xl">
        <CarrierResourcesGrid />
      </div>
    </div>
  );
}
