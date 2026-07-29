import { startOfDay } from "date-fns";
import { db } from "@/lib/db";
import { DateRange, MetricKey, rangeStart } from "@/lib/dashboardMetricsShared";

export * from "@/lib/dashboardMetricsShared";

type Scope = { agentId: string } | { agentId?: undefined };

async function submittedAgg(scope: Scope, since: Date) {
  return db.policy.aggregate({
    where: { ...scope, submittedAt: { gte: since } },
    _count: { _all: true },
    _sum: { annualPremium: true },
  });
}

async function issuedAgg(scope: Scope, since: Date) {
  return db.policy.aggregate({
    where: { ...scope, status: "ISSUED", issuedAt: { gte: since } },
    _count: { _all: true },
    _sum: { annualPremium: true },
  });
}

export async function computeMetrics(scope: Scope, range: DateRange, now: Date = new Date()) {
  const since = rangeStart(range, now);
  const [submitted, issued] = await Promise.all([submittedAgg(scope, since), issuedAgg(scope, since)]);

  const submittedCount = submitted._count._all;
  const submittedAP = Number(submitted._sum.annualPremium ?? 0);
  const issuedCount = issued._count._all;
  const issuedAP = Number(issued._sum.annualPremium ?? 0);

  const values: Record<MetricKey, number> = {
    submittedCount,
    submittedAP,
    issuedCount,
    issuedAP,
    conversionRate: submittedCount > 0 ? issuedCount / submittedCount : 0,
    avgIssuedPremium: issuedCount > 0 ? issuedAP / issuedCount : 0,
  };

  return values;
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
