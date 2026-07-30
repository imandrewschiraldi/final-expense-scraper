import { db } from "@/lib/db";
import { startOfDay, startOfWeek, startOfMonth, startOfYear, subDays, subWeeks, subMonths, subYears, format } from "date-fns";
import { TimelineGranularity } from "@/lib/productionAnalyticsShared";

export * from "@/lib/productionAnalyticsShared";

const POLICY_STATUSES = ["SUBMITTED", "PENDING", "ISSUED", "PLACED", "CANCELED", "LAPSED", "DECLINED", "CHARGEBACK"] as const;

function bucketKey(date: Date, granularity: TimelineGranularity): { key: string; sortKey: string; label: string } {
  switch (granularity) {
    case "daily": {
      const d = startOfDay(date);
      return { key: format(d, "yyyy-MM-dd"), sortKey: format(d, "yyyy-MM-dd"), label: format(d, "MMM d") };
    }
    case "weekly": {
      const d = startOfWeek(date, { weekStartsOn: 1 });
      return { key: format(d, "yyyy-MM-dd"), sortKey: format(d, "yyyy-MM-dd"), label: `Wk of ${format(d, "MMM d")}` };
    }
    case "monthly": {
      const d = startOfMonth(date);
      return { key: format(d, "yyyy-MM"), sortKey: format(d, "yyyy-MM"), label: format(d, "MMM yyyy") };
    }
    case "yearly": {
      const d = startOfYear(date);
      return { key: format(d, "yyyy"), sortKey: format(d, "yyyy"), label: format(d, "yyyy") };
    }
  }
}

function windowFor(granularity: TimelineGranularity, now: Date): Date {
  switch (granularity) {
    case "daily":
      return subDays(now, 30);
    case "weekly":
      return subWeeks(now, 12);
    case "monthly":
      return subMonths(now, 12);
    case "yearly":
      return subYears(now, 5);
  }
}

/** Production Timeline: daily/weekly/monthly/yearly submitted AP + count. */
export async function computeProductionTimeline(userId: string, granularity: TimelineGranularity, now: Date = new Date()) {
  const since = windowFor(granularity, now);
  const policies = await db.policy.findMany({
    where: { agentId: userId, submittedAt: { gte: since } },
    select: { annualPremium: true, submittedAt: true },
  });

  const buckets = new Map<string, { sortKey: string; label: string; ap: number; count: number }>();
  for (const p of policies) {
    const { key, sortKey, label } = bucketKey(p.submittedAt, granularity);
    const b = buckets.get(key) ?? { sortKey, label, ap: 0, count: 0 };
    b.ap += Number(p.annualPremium);
    b.count += 1;
    buckets.set(key, b);
  }

  return Array.from(buckets.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}

/** Rolling 8-week chart: weekly AP, policy count, avg case size. */
export async function computeRolling8Week(userId: string, now: Date = new Date()) {
  const since = subWeeks(startOfWeek(now, { weekStartsOn: 1 }), 7);
  const policies = await db.policy.findMany({
    where: { agentId: userId, submittedAt: { gte: since } },
    select: { annualPremium: true, submittedAt: true },
  });

  const buckets = new Map<string, { label: string; ap: number; count: number }>();
  for (let i = 0; i < 8; i++) {
    const weekStart = startOfWeek(subWeeks(now, 7 - i), { weekStartsOn: 1 });
    const key = format(weekStart, "yyyy-MM-dd");
    buckets.set(key, { label: `Wk of ${format(weekStart, "MMM d")}`, ap: 0, count: 0 });
  }
  for (const p of policies) {
    const weekStart = startOfWeek(p.submittedAt, { weekStartsOn: 1 });
    const key = format(weekStart, "yyyy-MM-dd");
    const b = buckets.get(key);
    if (!b) continue;
    b.ap += Number(p.annualPremium);
    b.count += 1;
  }

  return Array.from(buckets.values()).map((b) => ({ ...b, avgCaseSize: b.count > 0 ? b.ap / b.count : 0 }));
}

/** 12-month production trend: monthly AP, policy count, avg case size. */
export async function compute12MonthTrend(userId: string, now: Date = new Date()) {
  const since = subMonths(startOfMonth(now), 11);
  const policies = await db.policy.findMany({
    where: { agentId: userId, submittedAt: { gte: since } },
    select: { annualPremium: true, submittedAt: true },
  });

  const buckets = new Map<string, { label: string; ap: number; count: number }>();
  for (let i = 0; i < 12; i++) {
    const monthStart = startOfMonth(subMonths(now, 11 - i));
    const key = format(monthStart, "yyyy-MM");
    buckets.set(key, { label: format(monthStart, "MMM yyyy"), ap: 0, count: 0 });
  }
  for (const p of policies) {
    const key = format(startOfMonth(p.submittedAt), "yyyy-MM");
    const b = buckets.get(key);
    if (!b) continue;
    b.ap += Number(p.annualPremium);
    b.count += 1;
  }

  return Array.from(buckets.values()).map((b) => ({ ...b, avgCaseSize: b.count > 0 ? b.ap / b.count : 0 }));
}

/** GitHub-style production heat map: last 12 months, per-day AP/count/top carrier+product. */
export async function computeHeatMap(userId: string, now: Date = new Date()) {
  const since = subDays(startOfDay(now), 364);
  const policies = await db.policy.findMany({
    where: { agentId: userId, submittedAt: { gte: since } },
    select: { annualPremium: true, submittedAt: true, carrier: true, product: true },
  });

  const days = new Map<
    string,
    { ap: number; count: number; carriers: Map<string, number>; products: Map<string, number> }
  >();
  for (const p of policies) {
    const key = format(startOfDay(p.submittedAt), "yyyy-MM-dd");
    const d = days.get(key) ?? { ap: 0, count: 0, carriers: new Map(), products: new Map() };
    d.ap += Number(p.annualPremium);
    d.count += 1;
    d.carriers.set(p.carrier, (d.carriers.get(p.carrier) ?? 0) + 1);
    if (p.product) d.products.set(p.product, (d.products.get(p.product) ?? 0) + 1);
    days.set(key, d);
  }

  const top = (m: Map<string, number>) => {
    if (m.size === 0) return null;
    const sorted = Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
    const [name] = sorted[0];
    return sorted.length > 1 ? `${name} +${sorted.length - 1} more` : name;
  };

  return Array.from(days.entries()).map(([date, d]) => ({
    date,
    ap: d.ap,
    count: d.count,
    topCarrier: top(d.carriers),
    topProduct: top(d.products),
  }));
}

/** Carrier Analytics: distribution, top carrier, avg premium per carrier. */
export async function computeCarrierAnalytics(userId: string, now: Date = new Date()) {
  const since = subMonths(startOfMonth(now), 11);
  const policies = await db.policy.findMany({
    where: { agentId: userId, submittedAt: { gte: since } },
    select: { annualPremium: true, carrier: true },
  });

  const buckets = new Map<string, { ap: number; count: number }>();
  for (const p of policies) {
    const b = buckets.get(p.carrier) ?? { ap: 0, count: 0 };
    b.ap += Number(p.annualPremium);
    b.count += 1;
    buckets.set(p.carrier, b);
  }

  return Array.from(buckets.entries())
    .map(([carrier, b]) => ({ carrier, ap: b.ap, count: b.count, avgPremium: b.count > 0 ? b.ap / b.count : 0 }))
    .sort((a, b) => b.ap - a.ap);
}

/** Product Analytics: distribution, top product, avg case size per product. */
export async function computeProductAnalytics(userId: string, now: Date = new Date()) {
  const since = subMonths(startOfMonth(now), 11);
  const policies = await db.policy.findMany({
    where: { agentId: userId, submittedAt: { gte: since } },
    select: { annualPremium: true, product: true },
  });

  const buckets = new Map<string, { ap: number; count: number }>();
  for (const p of policies) {
    const key = p.product ?? "Unspecified";
    const b = buckets.get(key) ?? { ap: 0, count: 0 };
    b.ap += Number(p.annualPremium);
    b.count += 1;
    buckets.set(key, b);
  }

  return Array.from(buckets.entries())
    .map(([product, b]) => ({ product, ap: b.ap, count: b.count, avgCaseSize: b.count > 0 ? b.ap / b.count : 0 }))
    .sort((a, b) => b.ap - a.ap);
}

/** Policy Status Analytics: status breakdown, conversion + placement rates, trend. */
export async function computePolicyStatusAnalytics(userId: string, now: Date = new Date()) {
  const since = subMonths(startOfMonth(now), 11);
  const policies = await db.policy.findMany({
    where: { agentId: userId, submittedAt: { gte: since } },
    select: { annualPremium: true, status: true },
  });

  const counts = new Map<string, number>(POLICY_STATUSES.map((s) => [s, 0]));
  for (const p of policies) counts.set(p.status, (counts.get(p.status) ?? 0) + 1);

  const total = policies.length;
  const breakdown = POLICY_STATUSES.map((status) => ({
    status,
    count: counts.get(status) ?? 0,
    percent: total > 0 ? ((counts.get(status) ?? 0) / total) * 100 : 0,
  }));

  const submitted = total;
  const issuedOrPlaced = (counts.get("ISSUED") ?? 0) + (counts.get("PLACED") ?? 0);
  const conversionRate = submitted > 0 ? issuedOrPlaced / submitted : 0;
  const placementRate = (counts.get("ISSUED") ?? 0) > 0 ? (counts.get("PLACED") ?? 0) / (counts.get("ISSUED") ?? 0) : 0;

  return { breakdown, conversionRate, placementRate, total };
}
