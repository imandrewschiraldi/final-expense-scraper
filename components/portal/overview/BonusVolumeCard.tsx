"use client";

import { Gift } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/portal/overview/SectionLabel";
import { formatCurrency, formatCompact } from "@/lib/formatMoney";
import { BONUS_TIERS, currentBonusTier, nextBonusTier } from "@/lib/bonusTiers";

function monthLabel() {
  return new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/** Personal production bonus progress — a monthly schedule, unlike Hall of
 *  Fame's calendar-YTD target, so it reads against its own monthly-only
 *  issued total and resets at the start of every month. */
export function BonusVolumeCard({ issuedAP }: { issuedAP: number }) {
  const current = currentBonusTier(issuedAP);
  const next = nextBonusTier(issuedAP);
  const floor = current?.threshold ?? 0;
  const ceiling = next?.threshold ?? BONUS_TIERS[BONUS_TIERS.length - 1].threshold;
  const pct = next ? Math.min(100, ((issuedAP - floor) / (ceiling - floor)) * 100) : 100;

  return (
    <Card data-tour="bonus-volume-card" className="flex h-full min-h-[380px] flex-col p-5">
      <div className="mb-4 flex items-center gap-2 border-b border-border pb-4">
        <Gift className="h-[18px] w-[18px]" style={{ color: "var(--copper-metal-hi)" }} />
        <h3 className="font-condensed text-[15.5px] font-extrabold tracking-wide text-white uppercase">Bonus</h3>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <SectionLabel explain="Personal issued premium so far this month, against the agency's tiered bonus schedule.">
          Bonus Volume
        </SectionLabel>
        <span className="text-sm">
          <span className="font-bold" style={{ color: "var(--green-light)" }}>
            {formatCurrency(issuedAP)}
          </span>
          <span className="text-muted"> / {formatCompact(ceiling)}</span>
        </span>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-surface2">
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--copper-metal-dk), var(--copper-metal-hi))" }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-foreground">
        <span>{Math.round(pct)}% to next tier</span>
        <span>{next ? `${formatCurrency(ceiling - issuedAP)} to the ${formatCompact(next.threshold)} tier` : "Top tier reached"}</span>
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <SectionLabel explain="The bonus you've earned at your current tier, based on this month's issued premium so far.">
          Bonus Earned
        </SectionLabel>
        <p className="mt-1.5 text-sm text-foreground">
          {current ? `${formatCurrency(current.bonus)} earned at the ${formatCompact(current.threshold)} tier.` : "No bonus tier reached yet this month."}
        </p>
      </div>

      <p className="mt-4 border-t border-border pt-3 text-xs text-muted">
        Month of {monthLabel()} &middot; Estimate
      </p>
    </Card>
  );
}
