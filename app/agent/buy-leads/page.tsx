import { BuyLeadsGrid } from "@/components/portal/BuyLeadsGrid";

export default function BuyLeadsPage() {
  return (
    <div>
      <h1 className="font-condensed metal-copper-text mb-10 text-3xl font-black tracking-wide uppercase">
        Trusted Lead Vendors
      </h1>
      <p className="mb-8 text-sm text-muted">
        Trusted lead sources our agents use to supplement what comes through the Vault.
      </p>
      <BuyLeadsGrid />
    </div>
  );
}
