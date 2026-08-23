"use client";

import { useEffect, useState } from "react";
import { AgencyKpiGrid } from "@/components/portal/agency/AgencyKpiGrid";
import { TopProducers } from "@/components/portal/agency/TopProducers";
import { RecentActivity } from "@/components/portal/agency/RecentActivity";
import { DashboardRangeSelect } from "@/components/portal/dashboard/DashboardRangeSelect";
import { PageHeading } from "@/components/portal/PageHeading";
import { ProductionTimeline } from "@/components/portal/dashboard/analytics/ProductionTimeline";
import { DistributionAnalytics } from "@/components/portal/dashboard/analytics/DistributionAnalytics";
import { StatusAnalytics } from "@/components/portal/dashboard/analytics/StatusAnalytics";
import { AgencyKpiData, TopProducer, RecentActivityItem } from "@/lib/agencyDashboardShared";
import { DashboardRange } from "@/lib/dashboardRange";

type Overview = {
  kpis: AgencyKpiData;
  topProducers: TopProducer[];
  recentActivity: RecentActivityItem[];
  analytics: {
    timeline: { label: string; ap: number; count: number }[];
    carriers: { carrier: string; ap: number; count: number; avgPremium: number }[];
    products: { product: string; ap: number; count: number; avgCaseSize: number }[];
    statusAnalytics: { breakdown: { status: string; count: number; percent: number }[]; conversionRate: number };
  };
};

const POLL_MS = 25000;

export function AgencyDashboardClient() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [range, setRange] = useState<DashboardRange>("monthly");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/portal/agency/overview?range=${range}`);
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? `Failed to load agency dashboard (${res.status})`);
        }
        setOverview(await res.json());
        setLoadError(null);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Failed to load agency dashboard.");
      }
    }
    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
  }, [range]);

  return (
    <div className="space-y-6">
      <PageHeading slug="agency-dashboard" alt="Agency Dashboard" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Company-wide production across every Tier 1 Financial agent.</p>
        <DashboardRangeSelect value={range} onChange={setRange} />
      </div>

      {loadError ? (
        <p className="text-sm text-red-light">{loadError}</p>
      ) : !overview ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : (
        <>
          <AgencyKpiGrid data={overview.kpis} />

          <div className="grid gap-4 lg:grid-cols-2">
            <TopProducers producers={overview.topProducers} />
            <RecentActivity items={overview.recentActivity} />
          </div>

          <div>
            <h2 className="mb-3 text-lg font-bold text-white">Agency Analytics</h2>
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
    </div>
  );
}
