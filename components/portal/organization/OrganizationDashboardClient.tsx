"use client";

import { useEffect, useState } from "react";
import { OrgKpiGrid } from "@/components/portal/organization/OrgKpiGrid";
import { TopProducers } from "@/components/portal/organization/TopProducers";
import { RecentActivity } from "@/components/portal/organization/RecentActivity";
import { DashboardRangeSelect } from "@/components/portal/dashboard/DashboardRangeSelect";
import { ProductionTimeline } from "@/components/portal/dashboard/analytics/ProductionTimeline";
import { DistributionAnalytics } from "@/components/portal/dashboard/analytics/DistributionAnalytics";
import { StatusAnalytics } from "@/components/portal/dashboard/analytics/StatusAnalytics";
import { OrgKpiData, TopProducer, RecentActivityItem } from "@/lib/organizationDashboardShared";
import { DashboardRange } from "@/lib/dashboardRange";

type Overview = {
  kpis: OrgKpiData;
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

export function OrganizationDashboardClient() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [range, setRange] = useState<DashboardRange>("monthly");

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/portal/organization/overview?range=${range}`);
      if (!res.ok) return;
      setOverview(await res.json());
    }
    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
  }, [range]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold text-white">Organization Dashboard</h1>
          <p className="text-sm text-muted">Company-wide production across every Tier 1 Financial agent.</p>
        </div>
        <DashboardRangeSelect value={range} onChange={setRange} />
      </div>

      {!overview ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : (
        <>
          <OrgKpiGrid data={overview.kpis} />

          <div className="grid gap-4 lg:grid-cols-2">
            <TopProducers producers={overview.topProducers} />
            <RecentActivity items={overview.recentActivity} />
          </div>

          <div>
            <h2 className="mb-3 text-lg font-bold text-white">Organization Analytics</h2>
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
