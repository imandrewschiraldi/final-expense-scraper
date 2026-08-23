"use client";

import { useEffect, useRef, useState } from "react";
import { KpiGrid } from "@/components/portal/dashboard/KpiGrid";
import { GoalsSection } from "@/components/portal/dashboard/GoalsSection";
import { CelebrationOverlay } from "@/components/portal/dashboard/CelebrationOverlay";
import { DashboardRangeSelect } from "@/components/portal/dashboard/DashboardRangeSelect";
import { PageHeading } from "@/components/portal/PageHeading";
import { ProductionTimeline } from "@/components/portal/dashboard/analytics/ProductionTimeline";
import { DistributionAnalytics } from "@/components/portal/dashboard/analytics/DistributionAnalytics";
import { StatusAnalytics } from "@/components/portal/dashboard/analytics/StatusAnalytics";
import { PersonalKpiData, GoalWithProgress, GOAL_CATEGORY_LABELS } from "@/lib/personalDashboardShared";
import { DashboardRange } from "@/lib/dashboardRange";

type Overview = {
  kpis: PersonalKpiData;
  goals: GoalWithProgress[];
  recentWins: { id: string; category: string; achievedAt: string | null }[];
  analytics: {
    timeline: { label: string; ap: number; count: number }[];
    carriers: { carrier: string; ap: number; count: number; avgPremium: number }[];
    products: { product: string; ap: number; count: number; avgCaseSize: number }[];
    statusAnalytics: { breakdown: { status: string; count: number; percent: number }[]; conversionRate: number };
  };
};

const POLL_MS = 25000;

export function PersonalDashboardClient() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [range, setRange] = useState<DashboardRange>("monthly");
  const [celebration, setCelebration] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const seenWinIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/portal/dashboard/overview?range=${range}`);
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? `Failed to load dashboard (${res.status})`);
        }
        const data: Overview = await res.json();
        setOverview(data);
        setLoadError(null);

        const currentIds = new Set(data.recentWins.map((w) => w.id));
        if (seenWinIds.current) {
          const newlyWon = data.recentWins.find((w) => !seenWinIds.current!.has(w.id));
          if (newlyWon) {
            setCelebration(GOAL_CATEGORY_LABELS[newlyWon.category] ?? newlyWon.category);
          }
        }
        seenWinIds.current = currentIds;
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Failed to load dashboard.");
      }
    }

    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
  }, [range, refreshTick]);

  function refresh() {
    setRefreshTick((t) => t + 1);
  }

  return (
    <div className="space-y-6">
      <PageHeading slug="dashboard" alt="Dashboard" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Your production at a glance, derived from submitted policies.</p>
        <DashboardRangeSelect value={range} onChange={setRange} />
      </div>

      {loadError ? (
        <p className="text-sm text-red-light">{loadError}</p>
      ) : !overview ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : (
        <>
          <KpiGrid data={overview.kpis} />

          <GoalsSection goals={overview.goals} recentWins={overview.recentWins} onChanged={refresh} />

          <div>
            <h2 className="mb-3 text-lg font-bold text-white">Production Analytics</h2>
            <div className="grid gap-4">
              <ProductionTimeline data={overview.analytics.timeline} />
              <div className="grid gap-4 lg:grid-cols-2">
                <DistributionAnalytics
                  title="Carrier Analytics"
                  avgLabel="avg"
                  items={overview.analytics.carriers.map((c) => ({ name: c.carrier, ap: c.ap, count: c.count, avg: c.avgPremium }))}
                />
                <DistributionAnalytics
                  title="Product Analytics"
                  avgLabel="avg case"
                  items={overview.analytics.products.map((p) => ({ name: p.product, ap: p.ap, count: p.count, avg: p.avgCaseSize }))}
                />
              </div>
              <StatusAnalytics
                breakdown={overview.analytics.statusAnalytics.breakdown}
                conversionRate={overview.analytics.statusAnalytics.conversionRate}
              />
            </div>
          </div>
        </>
      )}

      <CelebrationOverlay label={celebration} onDismiss={() => setCelebration(null)} />
    </div>
  );
}
