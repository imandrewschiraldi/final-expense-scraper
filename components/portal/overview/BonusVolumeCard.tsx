"use client";

import { Gift } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { BONUS_TIERS, currentBonusTier, nextBonusTier } from "@/lib/bonusTiers";

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

/** Personal production bonus progress — same issuedAP figure Hall of Fame
 *  already shows, just read against the agency's tiered bonus schedule
 *  instead of a single flat target. */
export function BonusVolumeCard({ issuedAP }: { issuedAP: number }) {
  const current = currentBonusTier(issuedAP);
  const next = nextBonusTier(issuedAP);
  const floor = current?.threshold ?? 0;
  const ceiling = next?.threshold ?? BONUS_TIERS[BONUS_TIERS.length - 1].threshold;
  const pct = next ? Math.min(100, ((issuedAP - floor) / (ceiling - floor)) * 100) : 100;

  return (
    <Card data-tour="bonus-volume-card" className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gift className="h-[18px] w-[18px]" style={{ color: "var(--copper-metal-hi)" }} />
          <h3 className="font-condensed text-[15.5px] font-extrabold tracking-wide text-white uppercase">Bonus Volume</h3>
        </div>
        <span className="text-xs text-muted">{formatCurrency(issuedAP)} issued</span>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-surface2">
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--copper-metal-dk), var(--copper-metal-hi))" }}
        />
      </div>

      <p className="mt-3 text-sm text-foreground">
        {current ? `${formatCurrency(current.bonus)} bonus earned` : "No bonus tier reached yet"}
      </p>
      <p className="mt-1 text-xs text-muted">
        {next
          ? `${formatCurrency(ceiling - issuedAP)} to a ${formatCurrency(next.bonus)} bonus at ${formatCurrency(next.threshold)} issued`
          : "Top bonus tier reached for the year"}
      </p>
    </Card>
  );
}
