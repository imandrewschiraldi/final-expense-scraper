"use client";

import { Trophy } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/portal/overview/SectionLabel";
import { formatCurrency, formatCompact } from "@/lib/formatMoney";

function daysLeftInYear() {
  const now = new Date();
  const yearEnd = new Date(now.getFullYear(), 11, 31);
  return Math.max(0, Math.ceil((yearEnd.getTime() - now.getTime()) / 86_400_000));
}

export function HallOfFameCard({ issuedAP, targetAP }: { issuedAP: number; targetAP: number }) {
  const pct = targetAP > 0 ? Math.min(100, (issuedAP / targetAP) * 100) : 0;
  const remaining = Math.max(0, targetAP - issuedAP);
  const hit = issuedAP >= targetAP;

  return (
    <Card data-tour="hall-of-fame-card" className="p-5">
      <div className="mb-4 flex items-center gap-2 border-b border-border pb-4">
        <Trophy className="h-[18px] w-[18px]" style={{ color: "var(--copper-metal-hi)" }} />
        <h3 className="font-condensed text-[15.5px] font-extrabold tracking-wide text-white uppercase">Hall of Fame</h3>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <SectionLabel explain="Personal issued premium for the calendar year, against the agency's Hall of Fame goal.">
          Progress
        </SectionLabel>
        <span className="text-sm">
          <span className="font-bold" style={{ color: "var(--green-light)" }}>
            {formatCurrency(issuedAP)}
          </span>
          <span className="text-muted"> / {formatCompact(targetAP)}</span>
        </span>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-surface2">
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--copper-metal-dk), var(--copper-metal-hi))" }}
        />
      </div>

      <p className="mt-2 text-sm text-foreground">
        {hit ? "You've hit Hall of Fame for this calendar year." : `${formatCurrency(remaining)} to go`}
      </p>

      <p className="mt-4 border-t border-border pt-3 text-xs text-muted">Calendar YTD &middot; {daysLeftInYear()} days left</p>
    </Card>
  );
}
