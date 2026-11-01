"use client";

import { Trophy } from "lucide-react";
import { Card } from "@/components/ui/Card";

function daysLeftInYear() {
  const now = new Date();
  const yearEnd = new Date(now.getFullYear(), 11, 31);
  return Math.max(0, Math.ceil((yearEnd.getTime() - now.getTime()) / 86_400_000));
}

function formatCurrency(value: number) {
  if (value >= 1000) return `$${Math.round(value / 1000)}k`;
  return `$${Math.round(value)}`;
}

export function HallOfFameCard({ issuedAP, targetAP }: { issuedAP: number; targetAP: number }) {
  const pct = targetAP > 0 ? Math.min(100, (issuedAP / targetAP) * 100) : 0;
  const remaining = Math.max(0, targetAP - issuedAP);
  const hit = issuedAP >= targetAP;

  return (
    <Card data-tour="hall-of-fame-card" className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-[18px] w-[18px]" style={{ color: "var(--copper-metal-hi)" }} />
          <h3 className="font-condensed text-[15.5px] font-extrabold tracking-wide text-white uppercase">Hall of Fame</h3>
        </div>
        <span className="text-xs text-muted">
          {issuedAP.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })} /{" "}
          {formatCurrency(targetAP)}
        </span>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-surface2">
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--copper-metal-dk), var(--copper-metal-hi))" }}
        />
      </div>

      <p className="mt-3 text-sm text-foreground">
        {hit
          ? "You've hit Hall of Fame for this calendar year."
          : `${remaining.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })} to go`}
      </p>
      <p className="mt-1 text-xs text-muted">Calendar YTD &middot; {daysLeftInYear()} days left</p>
    </Card>
  );
}
