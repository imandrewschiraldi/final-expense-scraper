import { Suspense } from "react";
import { getInventory } from "@/lib/shop/inventory";
import { getBuyer } from "@/lib/shop/session";
import { HOLD_DAYS, MIN_ORDER_CENTS, formatCents } from "@/lib/shop/config";
import { ShopStorefront } from "@/components/shop/ShopStorefront";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const [inv, buyer] = await Promise.all([getInventory(), getBuyer()]);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-condensed text-3xl font-bold text-white sm:text-4xl">Veteran final expense leads</h1>
        <p className="mt-2 max-w-[70ch] text-foreground/80">
          Pick a lead age, choose your states, and your leads arrive by email as a CSV file. Every lead you buy is
          held for you for {HOLD_DAYS} days. Minimum order {formatCents(MIN_ORDER_CENTS)}.
        </p>
      </div>
      {/* useSearchParams inside needs a Suspense boundary. */}
      <Suspense fallback={null}>
        <ShopStorefront
          byTier={inv.byTier}
          tierTotals={inv.tierTotals}
          available={inv.available}
          buyer={buyer ? { email: buyer.email, name: buyer.name } : null}
        />
      </Suspense>
    </div>
  );
}
