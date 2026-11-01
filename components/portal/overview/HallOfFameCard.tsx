"use client";

import { Trophy, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/portal/overview/SectionLabel";
import { formatCurrency, formatCompact } from "@/lib/formatMoney";

function daysLeftInYear() {
  const now = new Date();
  const yearEnd = new Date(now.getFullYear(), 11, 31);
  return Math.max(0, Math.ceil((yearEnd.getTime() - now.getTime()) / 86_400_000));
}

type Track = { issuedAP: number; targetAP: number };

const TRACKS: { key: keyof HallOfFameProps; label: string; explain: string }[] = [
  { key: "personal", label: "Personal", explain: "Personal issued premium in Life only for the calendar year." },
  { key: "agency", label: "Agency", explain: "Issued premium across you and your downline, all lines, for the calendar year." },
  { key: "annuity", label: "Annuity", explain: "Personal issued premium in Annuities only for the calendar year." },
];

type HallOfFameProps = { personal: Track; agency: Track; annuity: Track };

function TrackRow({ label, explain, issuedAP, targetAP, first }: Track & { label: string; explain: string; first: boolean }) {
  const pct = targetAP > 0 ? Math.min(100, (issuedAP / targetAP) * 100) : 0;
  const hit = issuedAP >= targetAP;

  return (
    <div className={first ? "" : "mt-4 border-t border-border pt-4"}>
      <div className="mb-2 flex items-center justify-between">
        <SectionLabel explain={explain}>{label}</SectionLabel>
        <span className="flex items-center gap-1.5 text-sm">
          {hit && <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "var(--green-light)" }} />}
          <span>
            <span className="font-bold" style={{ color: "var(--green-light)" }}>
              {formatCurrency(issuedAP)}
            </span>
            <span className="text-muted"> / {formatCompact(targetAP)}</span>
          </span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface2">
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--copper-metal-dk), var(--copper-metal-hi))" }}
        />
      </div>
    </div>
  );
}

export function HallOfFameCard({ personal, agency, annuity }: HallOfFameProps) {
  const data = { personal, agency, annuity };

  return (
    <Card data-tour="hall-of-fame-card" className="flex h-full min-h-[380px] flex-col p-5">
      <div className="mb-4 flex items-center gap-2 border-b border-border pb-4">
        <Trophy className="h-[18px] w-[18px]" style={{ color: "var(--copper-metal-hi)" }} />
        <h3 className="font-condensed text-[15.5px] font-extrabold tracking-wide text-white uppercase">Hall of Fame</h3>
      </div>

      {TRACKS.map((t, i) => (
        <TrackRow key={t.key} label={t.label} explain={t.explain} {...data[t.key]} first={i === 0} />
      ))}

      <p className="mt-4 border-t border-border pt-3 text-xs text-muted">Calendar YTD &middot; {daysLeftInYear()} days left</p>
    </Card>
  );
}
