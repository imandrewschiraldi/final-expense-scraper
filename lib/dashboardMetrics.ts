import { startOfDay } from "date-fns";
import { db } from "@/lib/db";
import { DateRange, MetricKey, rangeStart, comparisonWindow } from "@/lib/dashboardMetricsShared";

export * from "@/lib/dashboardMetricsShared";

type Scope = { agentId: string } | { agentId?: undefined };
type Window = { gte: Date; lt?: Date };

async function submittedAgg(scope: Scope, window: Window) {
  return db.policy.aggregate({
    where: { ...scope, submittedAt: window },
    _count: { _all: true },
    _sum: { annualPremium: true },
  });
}

async function issuedAgg(scope: Scope, window: Window) {
  return db.policy.aggregate({
    where: { ...scope, status: "ISSUED", issuedAt: window },
    _count: { _all: true },
    _sum: { annualPremium: true },
  });
}

async function metricsForWindow(scope: Scope, window: Window): Promise<Record<MetricKey, number>> {
  const [submitted, issued] = await Promise.all([submittedAgg(scope, window), issuedAgg(scope, window)]);

  const submittedCount = submitted._count._all;
  const submittedAP = Number(submitted._sum.annualPremium ?? 0);
  const issuedCount = issued._count._all;
  const issuedAP = Number(issued._sum.annualPremium ?? 0);

  return {
    submittedCount,
    submittedAP,
    issuedCount,
    issuedAP,
    conversionRate: submittedCount > 0 ? issuedCount / submittedCount : 0,
    avgIssuedPremium: issuedCount > 0 ? issuedAP / issuedCount : 0,
  };
}

export async function computeMetrics(scope: Scope, range: DateRange, now: Date = new Date()) {
  return metricsForWindow(scope, { gte: rangeStart(range, now) });
}

/** The comparable prior-period values, for the KPI card trend deltas. */
export async function computePreviousMetrics(scope: Scope, range: DateRange, now: Date = new Date()) {
  const { start, end } = comparisonWindow(range, now);
  return metricsForWindow(scope, { gte: start, lt: end });
}

/** Per-day breakdown of a metric for the "personal" trend chart widgets. */
export async function computeDailyBreakdown(scope: Scope, metric: MetricKey, range: DateRange, now: Date = new Date()) {
  const since = rangeStart(range, now);
  const isIssued = metric === "issuedCount" || metric === "issuedAP" || metric === "avgIssuedPremium";

  const policies = await db.policy.findMany({
    where: isIssued
      ? { ...scope, status: "ISSUED", issuedAt: { gte: since } }
      : { ...scope, submittedAt: { gte: since } },
    select: { annualPremium: true, submittedAt: true, issuedAt: true },
  });

  const buckets = new Map<string, { count: number; sum: number }>();
  for (const p of policies) {
    const d = isIssued ? p.issuedAt! : p.submittedAt;
    const key = startOfDay(d).toISOString().slice(0, 10);
    const bucket = buckets.get(key) ?? { count: 0, sum: 0 };
    bucket.count += 1;
    bucket.sum += Number(p.annualPremium);
    buckets.set(key, bucket);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { count, sum }]) => ({
      label: date,
      value: metric === "submittedAP" || metric === "issuedAP" ? sum : count,
    }));
}

/** Per-agent breakdown of a metric for the "team" bar/line chart widgets. */
export async function computeAgentBreakdown(metric: MetricKey, range: DateRange, now: Date = new Date()) {
  const since = rangeStart(range, now);
  const isIssued = metric === "issuedCount" || metric === "issuedAP" || metric === "avgIssuedPremium";

  const policies = await db.policy.findMany({
    where: isIssued
      ? { status: "ISSUED", issuedAt: { gte: since }, agentId: { not: null } }
      : { submittedAt: { gte: since }, agentId: { not: null } },
    select: { annualPremium: true, agent: { select: { name: true } } },
  });

  const buckets = new Map<string, { count: number; sum: number }>();
  for (const p of policies) {
    const key = p.agent?.name ?? "Unknown";
    const bucket = buckets.get(key) ?? { count: 0, sum: 0 };
    bucket.count += 1;
    bucket.sum += Number(p.annualPremium);
    buckets.set(key, bucket);
  }

  return Array.from(buckets.entries())
    .map(([label, { count, sum }]) => ({
      label,
      value: metric === "submittedAP" || metric === "issuedAP" ? sum : count,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
}
