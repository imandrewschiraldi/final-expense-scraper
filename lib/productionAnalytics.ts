import { db } from "@/lib/db";
import { startOfDay, startOfWeek, startOfMonth, startOfYear, subDays, subWeeks, subMonths, format } from "date-fns";
import { DashboardRange } from "@/lib/dashboardRange";
import { PRODUCTS } from "@/lib/products";
import type { PolicyStatus } from "@prisma/client";

export const POLICY_STATUSES = ["SUBMITTED", "ISSUED", "CHARGEBACK"] as const;

export type Bucket = "daily" | "weekly" | "monthly";

export function windowFor(range: DashboardRange, now: Date): { since: Date | null; bucket: Bucket } {
  switch (range) {
    case "daily":
      return { since: subDays(startOfDay(now), 29), bucket: "daily" };
    case "weekly":
      return { since: subWeeks(startOfWeek(now, { weekStartsOn: 1 }), 11), bucket: "weekly" };
    case "monthly":
      return { since: subMonths(startOfMonth(now), 11), bucket: "monthly" };
    case "ytd":
      return { since: startOfYear(now), bucket: "monthly" };
    case "all":
      return { since: null, bucket: "monthly" };
  }
}

export function bucketKey(date: Date, bucket: Bucket): { key: string; label: string } {
  switch (bucket) {
    case "daily": {
      const d = startOfDay(date);
      return { key: format(d, "yyyy-MM-dd"), label: format(d, "MMM d") };
    }
    case "weekly": {
      const d = startOfWeek(date, { weekStartsOn: 1 });
      return { key: format(d, "yyyy-MM-dd"), label: `Wk of ${format(d, "MMM d")}` };
    }
    case "monthly": {
      const d = startOfMonth(date);
      return { key: format(d, "yyyy-MM"), label: format(d, "MMM yyyy") };
    }
  }
}

/**
 * A row shape wide enough to cover both a real Prisma Policy and a fake
 * Demo Mode policy — lets the Agency Dashboard fold one viewer's own demo
 * policies into the org-wide aggregates below without duplicating the
 * aggregation logic per data source.
 */
export type AnalyticsRow = {
  annualPremium: number;
  submittedAt: Date;
  carrier: string;
  product: string | null;
  status: PolicyStatus;
};

/**
 * Org-wide demo overlay: when set, `excludeAgentId`'s real rows are left out
 * of the DB query (that agent's real production is replaced, not stacked)
 * and `rows` (their fake policies) are folded in instead — mirroring how
 * the Leaderboard replaces just one agent's own row.
 */
export type DemoOverlay = { excludeAgentId: string; rows: AnalyticsRow[] };

function inRangeRows<T extends { submittedAt: Date }>(rows: T[], since: Date | null): T[] {
  return since ? rows.filter((r) => r.submittedAt >= since) : rows;
}

export function timelineFromRows(rows: Pick<AnalyticsRow, "annualPremium" | "submittedAt">[], range: DashboardRange, now: Date) {
  const { since, bucket } = windowFor(range, now);
  const buckets = new Map<string, { label: string; ap: number; count: number }>();
  for (const r of inRangeRows(rows, since)) {
    const { key, label } = bucketKey(r.submittedAt, bucket);
    const b = buckets.get(key) ?? { label, ap: 0, count: 0 };
    b.ap += r.annualPremium;
    b.count += 1;
    buckets.set(key, b);
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);
}

/** Single Production Timeline chart backing the whole analytics section. `agentId: null` means org-wide (no agent filter). */
export async function computeProductionTimeline(
  agentId: string | null,
  range: DashboardRange,
  now: Date = new Date(),
  demoOverlay?: DemoOverlay,
) {
  const { since } = windowFor(range, now);
  const policies = await db.policy.findMany({
    where: {
      ...(agentId ? { agentId } : {}),
      ...(demoOverlay ? { agentId: { not: demoOverlay.excludeAgentId } } : {}),
      ...(since ? { submittedAt: { gte: since } } : {}),
    },
    select: { annualPremium: true, submittedAt: true },
  });
  const rows = policies.map((p) => ({ annualPremium: Number(p.annualPremium), submittedAt: p.submittedAt }));
  return timelineFromRows([...rows, ...(demoOverlay?.rows ?? [])], range, now);
}

export function carrierFromRows(rows: Pick<AnalyticsRow, "annualPremium" | "carrier" | "submittedAt">[], range: DashboardRange, now: Date) {
  const { since } = windowFor(range, now);
  const buckets = new Map<string, { ap: number; count: number }>();
  for (const r of inRangeRows(rows, since)) {
    const b = buckets.get(r.carrier) ?? { ap: 0, count: 0 };
    b.ap += r.annualPremium;
    b.count += 1;
    buckets.set(r.carrier, b);
  }
  return Array.from(buckets.entries())
    .map(([carrier, b]) => ({ carrier, ap: b.ap, count: b.count, avgPremium: b.count > 0 ? b.ap / b.count : 0 }))
    .sort((a, b) => b.ap - a.ap);
}

/** Carrier Analytics: distribution, top carrier, avg premium per carrier. `agentId: null` means org-wide. */
export async function computeCarrierAnalytics(
  agentId: string | null,
  range: DashboardRange,
  now: Date = new Date(),
  demoOverlay?: DemoOverlay,
) {
  const { since } = windowFor(range, now);
  const policies = await db.policy.findMany({
    where: {
      ...(agentId ? { agentId } : {}),
      ...(demoOverlay ? { agentId: { not: demoOverlay.excludeAgentId } } : {}),
      ...(since ? { submittedAt: { gte: since } } : {}),
    },
    select: { annualPremium: true, carrier: true, submittedAt: true },
  });
  const rows = policies.map((p) => ({ annualPremium: Number(p.annualPremium), carrier: p.carrier, submittedAt: p.submittedAt }));
  return carrierFromRows([...rows, ...(demoOverlay?.rows ?? [])], range, now);
}

export function productFromRows(rows: Pick<AnalyticsRow, "annualPremium" | "product" | "submittedAt">[], range: DashboardRange, now: Date) {
  const { since } = windowFor(range, now);
  const buckets = new Map<string, { ap: number; count: number }>(PRODUCTS.map((p) => [p, { ap: 0, count: 0 }]));
  for (const r of inRangeRows(rows, since)) {
    const key = r.product && (PRODUCTS as readonly string[]).includes(r.product) ? r.product : null;
    if (!key) continue;
    const b = buckets.get(key)!;
    b.ap += r.annualPremium;
    b.count += 1;
  }
  return PRODUCTS.map((product) => {
    const b = buckets.get(product)!;
    return { product, ap: b.ap, count: b.count, avgCaseSize: b.count > 0 ? b.ap / b.count : 0 };
  });
}

/** Product Analytics: fixed product list/order, zero-filled when unused. `agentId: null` means org-wide. */
export async function computeProductAnalytics(
  agentId: string | null,
  range: DashboardRange,
  now: Date = new Date(),
  demoOverlay?: DemoOverlay,
) {
  const { since } = windowFor(range, now);
  const policies = await db.policy.findMany({
    where: {
      ...(agentId ? { agentId } : {}),
      ...(demoOverlay ? { agentId: { not: demoOverlay.excludeAgentId } } : {}),
      ...(since ? { submittedAt: { gte: since } } : {}),
    },
    select: { annualPremium: true, product: true, submittedAt: true },
  });
  const rows = policies.map((p) => ({ annualPremium: Number(p.annualPremium), product: p.product, submittedAt: p.submittedAt }));
  return productFromRows([...rows, ...(demoOverlay?.rows ?? [])], range, now);
}

export function statusFromRows(rows: Pick<AnalyticsRow, "status" | "submittedAt">[], range: DashboardRange, now: Date) {
  const { since } = windowFor(range, now);
  const inRange = inRangeRows(rows, since);
  const counts = new Map<string, number>(POLICY_STATUSES.map((s) => [s, 0]));
  for (const r of inRange) counts.set(r.status, (counts.get(r.status) ?? 0) + 1);

  const total = inRange.length;
  const breakdown = POLICY_STATUSES.map((status) => ({
    status,
    count: counts.get(status) ?? 0,
    percent: total > 0 ? ((counts.get(status) ?? 0) / total) * 100 : 0,
  }));

  const conversionRate = total > 0 ? (counts.get("ISSUED") ?? 0) / total : 0;

  return { breakdown, conversionRate, total };
}

/** Policy Status Analytics: Submitted/Issued/Chargeback breakdown + conversion rate. `agentId: null` means org-wide. */
export async function computePolicyStatusAnalytics(
  agentId: string | null,
  range: DashboardRange,
  now: Date = new Date(),
  demoOverlay?: DemoOverlay,
) {
  const { since } = windowFor(range, now);
  const policies = await db.policy.findMany({
    where: {
      ...(agentId ? { agentId } : {}),
      ...(demoOverlay ? { agentId: { not: demoOverlay.excludeAgentId } } : {}),
      ...(since ? { submittedAt: { gte: since } } : {}),
    },
    select: { status: true, submittedAt: true },
  });
  return statusFromRows([...policies, ...(demoOverlay?.rows ?? [])], range, now);
}

/**
 * Same window-metrics shape as `metricsForWindow` (personalDashboard.ts),
 * but operating on an in-memory row array instead of a DB groupBy — used
 * only by the Agency Dashboard's demo-overlay path, where one viewer's fake
 * rows have to be merged with everyone else's real ones before aggregating.
 */
export function metricsFromRows(rows: Pick<AnalyticsRow, "annualPremium" | "submittedAt" | "status">[], window: { gte?: Date; lt?: Date }) {
  const inRange = rows.filter((r) => (!window.gte || r.submittedAt >= window.gte) && (!window.lt || r.submittedAt < window.lt));

  const submittedAP = inRange.reduce((sum, r) => sum + r.annualPremium, 0);
  const submittedCount = inRange.length;
  const issued = inRange.filter((r) => r.status === "ISSUED");
  const issuedAP = issued.reduce((sum, r) => sum + r.annualPremium, 0);
  const issuedCount = issued.length;
  const chargebacks = inRange.filter((r) => r.status === "CHARGEBACK");
  const chargebackAP = chargebacks.reduce((sum, r) => sum + r.annualPremium, 0);
  const activeCount = submittedCount - chargebacks.length;

  return {
    submittedAP,
    submittedCount,
    issuedAP,
    issuedCount,
    chargebackAP,
    activeCount,
    avgCaseSize: issuedCount > 0 ? issuedAP / issuedCount : 0,
  };
}
