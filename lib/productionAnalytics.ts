import { db } from "@/lib/db";
import { startOfDay, startOfWeek, startOfMonth, startOfYear, subDays, subWeeks, subMonths, format } from "date-fns";
import { DashboardRange } from "@/lib/dashboardRange";
import { PRODUCTS } from "@/lib/products";

const POLICY_STATUSES = ["SUBMITTED", "ISSUED", "CHARGEBACK"] as const;

type Bucket = "daily" | "weekly" | "monthly";

function windowFor(range: DashboardRange, now: Date): { since: Date | null; bucket: Bucket } {
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

function bucketKey(date: Date, bucket: Bucket): { key: string; label: string } {
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

/** Single Production Timeline chart backing the whole analytics section. */
export async function computeProductionTimeline(userId: string, range: DashboardRange, now: Date = new Date()) {
  const { since, bucket } = windowFor(range, now);
  const policies = await db.policy.findMany({
    where: { agentId: userId, ...(since ? { submittedAt: { gte: since } } : {}) },
    select: { annualPremium: true, submittedAt: true },
  });

  const buckets = new Map<string, { label: string; ap: number; count: number }>();
  for (const p of policies) {
    const { key, label } = bucketKey(p.submittedAt, bucket);
    const b = buckets.get(key) ?? { label, ap: 0, count: 0 };
    b.ap += Number(p.annualPremium);
    b.count += 1;
    buckets.set(key, b);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);
}

/** Carrier Analytics: distribution, top carrier, avg premium per carrier. */
export async function computeCarrierAnalytics(userId: string, range: DashboardRange, now: Date = new Date()) {
  const { since } = windowFor(range, now);
  const policies = await db.policy.findMany({
    where: { agentId: userId, ...(since ? { submittedAt: { gte: since } } : {}) },
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

/** Product Analytics: fixed product list/order, zero-filled when unused. */
export async function computeProductAnalytics(userId: string, range: DashboardRange, now: Date = new Date()) {
  const { since } = windowFor(range, now);
  const policies = await db.policy.findMany({
    where: { agentId: userId, ...(since ? { submittedAt: { gte: since } } : {}) },
    select: { annualPremium: true, product: true },
  });

  const buckets = new Map<string, { ap: number; count: number }>(PRODUCTS.map((p) => [p, { ap: 0, count: 0 }]));
  for (const p of policies) {
    const key = p.product && (PRODUCTS as readonly string[]).includes(p.product) ? p.product : null;
    if (!key) continue;
    const b = buckets.get(key)!;
    b.ap += Number(p.annualPremium);
    b.count += 1;
  }

  return PRODUCTS.map((product) => {
    const b = buckets.get(product)!;
    return { product, ap: b.ap, count: b.count, avgCaseSize: b.count > 0 ? b.ap / b.count : 0 };
  });
}

/** Policy Status Analytics: Submitted/Issued/Chargeback breakdown + conversion rate. */
export async function computePolicyStatusAnalytics(userId: string, range: DashboardRange, now: Date = new Date()) {
  const { since } = windowFor(range, now);
  const policies = await db.policy.findMany({
    where: { agentId: userId, ...(since ? { submittedAt: { gte: since } } : {}) },
    select: { status: true },
  });

  const counts = new Map<string, number>(POLICY_STATUSES.map((s) => [s, 0]));
  for (const p of policies) counts.set(p.status, (counts.get(p.status) ?? 0) + 1);

  const total = policies.length;
  const breakdown = POLICY_STATUSES.map((status) => ({
    status,
    count: counts.get(status) ?? 0,
    percent: total > 0 ? ((counts.get(status) ?? 0) / total) * 100 : 0,
  }));

  const conversionRate = total > 0 ? (counts.get("ISSUED") ?? 0) / total : 0;

  return { breakdown, conversionRate, total };
}
