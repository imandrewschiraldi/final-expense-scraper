"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Crown } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/formatMoney";

type Ranking = { id: string; name: string; issuedAP: number; issuedCount: number };

const TOP_N = 5;

/** Condensed top-5 preview of the full Leaderboard page — its own fetch
 *  against that same endpoint, not a copy of its ranking logic (including
 *  the Demo Mode overlay, which the endpoint already applies server-side). */
export function MiniLeaderboard() {
  const [rankings, setRankings] = useState<Ranking[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/portal/leaderboard?period=monthly")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => !cancelled && setRankings(data.rankings ?? []))
      .catch(() => !cancelled && setRankings([]));
    return () => {
      cancelled = true;
    };
  }, []);

  const top = (rankings ?? []).slice(0, TOP_N);

  return (
    <Card data-tour="leaderboard-widget" className="flex h-full flex-col p-5">
      <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <Crown className="h-[18px] w-[18px]" style={{ color: "var(--copper-metal-hi)" }} />
          <h3 className="font-condensed text-[15.5px] font-extrabold tracking-wide text-white uppercase">Leaderboard</h3>
        </div>
        <Link href="/leaderboard" className="font-condensed text-[11px] font-bold tracking-wide text-teal-light uppercase hover:underline">
          View All
        </Link>
      </div>

      {!rankings ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : top.length === 0 ? (
        <p className="text-sm text-muted">No production yet this month.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {top.map((r, i) => (
            <div key={r.id} className="flex items-center gap-2.5">
              <span className="font-condensed w-4 shrink-0 text-[13px] font-extrabold text-muted">{i + 1}</span>
              <div className="font-condensed flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full border border-border bg-surface2 text-[11px] font-bold text-muted">
                {r.name.charAt(0).toUpperCase()}
              </div>
              <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-foreground">{r.name}</span>
              <span className="font-condensed shrink-0 text-[12.5px] font-bold" style={{ color: "var(--green-light)" }}>
                {formatCurrency(r.issuedAP)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
