import { BuyLeadsGrid } from "@/components/portal/BuyLeadsGrid";

export default function BuyLeadsPage() {
  return (
    <div>
      <h1 className="mb-10 text-2xl font-extrabold tracking-wide text-white uppercase">Buy Leads</h1>
      <p className="mb-8 text-sm text-muted">
        Trusted lead sources our agents use to supplement what comes through the Vault.
      </p>
      <BuyLeadsGrid />
    </div>
  );
}
