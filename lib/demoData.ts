import { PolicyStatus } from "@prisma/client";
import { DashboardRange, rangeSince, previousRangeWindow } from "@/lib/dashboardRange";
import { PRODUCTS } from "@/lib/products";
import { windowFor, bucketKey, POLICY_STATUSES } from "@/lib/productionAnalytics";
import { computeCommissionAmount } from "@/lib/commission";
import { PersonalKpiData, CommissionsPaidCardData } from "@/lib/personalDashboardShared";

/**
 * Demo Mode's entire fake dataset, generated in-memory and never written to
 * the database — every function below reads this instead of Prisma, so a
 * viewer's own Dashboard/Book of Business/Leaderboard swap to fake numbers
 * without ever touching a real row or any other user's view.
 *
 * Deterministic (a fixed PRNG seed): the same 520 policies every time, so
 * numbers don't visibly jump around between the dashboard's 25s polls.
 */

export type DemoPolicy = {
  id: string;
  clientName: string;
  clientPhone: string | null;
  state: string | null;
  carrier: string;
  product: string;
  annualPremium: number;
  status: PolicyStatus;
  submittedAt: Date;
  issuedAt: Date | null;
  commissionAmount: number;
};

const DEMO_POLICY_COUNT = 520;
// Purely for shaping the fake commissionAmount figures — not a real comp
// level or rate, just plausible-looking inputs to the same real formula.
const DEMO_COMP_LEVEL_PERCENT = 0.8;
const DEMO_PAYOUT_MULTIPLIER = 0.9;

const DEMO_CARRIERS = ["Americo", "Aetna", "Foresters", "Mutual of Omaha", "Royal Neighbors", "Transamerica"];
const DEMO_STATES = ["FL", "GA", "TX", "OH", "NC", "TN", "AL", "SC", "MI", "PA"];
const DEMO_FIRST_NAMES = [
  "James", "Mary", "Robert", "Patricia", "John", "Linda", "Michael", "Barbara", "William", "Elizabeth",
  "David", "Susan", "Richard", "Jessica", "Joseph", "Sarah", "Thomas", "Karen", "Charles", "Nancy",
];
const DEMO_LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
  "Wilson", "Anderson", "Taylor", "Thomas", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
];

/** mulberry32 — small deterministic PRNG, seeded once per generator run. */
function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(arr: readonly T[], random: () => number): T {
  return arr[Math.floor(random() * arr.length)];
}

/**
 * 520 fake policies spread evenly (with natural jitter) across the trailing
 * 365 days ending `now` — never future-dated, roughly ~43/month, ~10/week.
 * ~8% end up Chargeback, matching a realistic-looking book; the rest split
 * between Submitted and Issued depending on how long ago they were sold.
 */
export function generateDemoPolicies(now: Date = new Date()): DemoPolicy[] {
  const random = mulberry32(20260828);
  const policies: DemoPolicy[] = [];
  const msPerDay = 24 * 60 * 60 * 1000;
  const spreadDays = 365;
  const stepDays = spreadDays / DEMO_POLICY_COUNT;

  for (let i = 0; i < DEMO_POLICY_COUNT; i++) {
    const jitterDays = (random() - 0.5) * stepDays * 0.8;
    const offsetDays = Math.min(spreadDays, Math.max(0, i * stepDays + jitterDays));
    const submittedAt = new Date(now.getTime() - offsetDays * msPerDay);

    const roll = random();
    const status: PolicyStatus = roll < 0.08 ? "CHARGEBACK" : roll < 0.7 ? "ISSUED" : "SUBMITTED";
    const daysSinceSubmit = offsetDays;
    const issuedAt =
      status !== "SUBMITTED" && daysSinceSubmit > 10
        ? new Date(Math.min(now.getTime(), submittedAt.getTime() + (5 + random() * 15) * msPerDay))
        : status !== "SUBMITTED"
          ? submittedAt
          : null;

    const annualPremium = Math.round(900 + random() * 1700);
    // Computed for every policy regardless of status — demoMetricsForWindow
    // is what excludes Chargebacks from the Commissions Paid total, same as
    // the real aggregation does.
    const commissionAmount = computeCommissionAmount({
      annualPremium,
      compLevelPercent: DEMO_COMP_LEVEL_PERCENT,
      payoutMultiplier: DEMO_PAYOUT_MULTIPLIER,
    });

    policies.push({
      id: `demo-${i}`,
      clientName: `${pick(DEMO_FIRST_NAMES, random)} ${pick(DEMO_LAST_NAMES, random)}`,
      clientPhone: null,
      state: pick(DEMO_STATES, random),
      carrier: pick(DEMO_CARRIERS, random),
      product: pick(PRODUCTS, random),
      annualPremium,
      status,
      submittedAt,
      issuedAt,
      commissionAmount,
    });
  }

  return policies.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
}

function inWindow(date: Date, window: { gte?: Date; lt?: Date }): boolean {
  if (window.gte && date < window.gte) return false;
  if (window.lt && date >= window.lt) return false;
  return true;
}

type DemoWindowMetrics = {
  submittedAP: number;
  submittedCount: number;
  issuedAP: number;
  issuedCount: number;
  chargebackAP: number;
  activeCount: number;
  avgCaseSize: number;
  commissionsPaid: number;
};

function demoMetricsForWindow(policies: DemoPolicy[], window: { gte?: Date; lt?: Date }): DemoWindowMetrics {
  const inRange = policies.filter((p) => inWindow(p.submittedAt, window));

  const submittedAP = inRange.reduce((sum, p) => sum + p.annualPremium, 0);
  const submittedCount = inRange.length;
  const issued = inRange.filter((p) => p.status === "ISSUED");
  const issuedAP = issued.reduce((sum, p) => sum + p.annualPremium, 0);
  const issuedCount = issued.length;
  const chargebacks = inRange.filter((p) => p.status === "CHARGEBACK");
  const chargebackAP = chargebacks.reduce((sum, p) => sum + p.annualPremium, 0);
  const activeCount = submittedCount - chargebacks.length;
  const commissionsPaid = inRange
    .filter((p) => p.status !== "CHARGEBACK")
    .reduce((sum, p) => sum + p.commissionAmount, 0);

  return {
    submittedAP,
    submittedCount,
    issuedAP,
    issuedCount,
    chargebackAP,
    activeCount,
    avgCaseSize: issuedCount > 0 ? issuedAP / issuedCount : 0,
    commissionsPaid,
  };
}

/**
 * The AP/count/case-size KPI tiles, faked. Goal Completion / Goal Remaining
 * are deliberately left out here — Demo Mode fakes production, not a
 * person's own goal-tracking, so those two tiles keep showing real data
 * (the caller merges them in from the real activeGoalsFor result).
 */
export function demoPersonalKpis(policies: DemoPolicy[], range: DashboardRange, now: Date = new Date()): PersonalKpiData {
  const since = rangeSince(range, now);
  const prev = previousRangeWindow(range, now);

  const current = demoMetricsForWindow(policies, since ? { gte: since } : {});
  const previous = prev ? demoMetricsForWindow(policies, { gte: prev.start, lt: prev.end }) : null;

  const withTrend = (value: number, previousValue: number | undefined) =>
    previousValue !== undefined ? { value, previousValue } : { value };

  return {
    annualPremium: withTrend(current.submittedAP, previous?.submittedAP),
    issuedPremium: withTrend(current.issuedAP, previous?.issuedAP),
    chargebackPremium: withTrend(current.chargebackAP, previous?.chargebackAP),
    policiesSubmitted: withTrend(current.submittedCount, previous?.submittedCount),
    activePolicies: withTrend(current.activeCount, previous?.activeCount),
    avgCaseSize: withTrend(current.avgCaseSize, previous?.avgCaseSize),
  };
}

export function demoCommissionsPaidCard(
  policies: DemoPolicy[],
  range: DashboardRange,
  agentName: string,
  agentProfileImageUrl: string | null,
  now: Date = new Date(),
): CommissionsPaidCardData {
  const since = rangeSince(range, now);
  const prev = previousRangeWindow(range, now);
  const current = demoMetricsForWindow(policies, since ? { gte: since } : {});
  const previous = prev ? demoMetricsForWindow(policies, { gte: prev.start, lt: prev.end }) : null;

  return {
    value: current.commissionsPaid,
    previousValue: previous?.commissionsPaid ?? 0,
    rangeLabel: range,
    agentName,
    agentProfileImageUrl,
  };
}

export function demoProductionTimeline(policies: DemoPolicy[], range: DashboardRange, now: Date = new Date()) {
  const { since, bucket } = windowFor(range, now);
  const inRange = policies.filter((p) => !since || p.submittedAt >= since);

  const buckets = new Map<string, { label: string; ap: number; count: number }>();
  for (const p of inRange) {
    const { key, label } = bucketKey(p.submittedAt, bucket);
    const b = buckets.get(key) ?? { label, ap: 0, count: 0 };
    b.ap += p.annualPremium;
    b.count += 1;
    buckets.set(key, b);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);
}

export function demoCarrierAnalytics(policies: DemoPolicy[], range: DashboardRange, now: Date = new Date()) {
  const { since } = windowFor(range, now);
  const inRange = policies.filter((p) => !since || p.submittedAt >= since);

  const buckets = new Map<string, { ap: number; count: number }>();
  for (const p of inRange) {
    const b = buckets.get(p.carrier) ?? { ap: 0, count: 0 };
    b.ap += p.annualPremium;
    b.count += 1;
    buckets.set(p.carrier, b);
  }

  return Array.from(buckets.entries())
    .map(([carrier, b]) => ({ carrier, ap: b.ap, count: b.count, avgPremium: b.count > 0 ? b.ap / b.count : 0 }))
    .sort((a, b) => b.ap - a.ap);
}

export function demoProductAnalytics(policies: DemoPolicy[], range: DashboardRange, now: Date = new Date()) {
  const { since } = windowFor(range, now);
  const inRange = policies.filter((p) => !since || p.submittedAt >= since);

  const buckets = new Map<string, { ap: number; count: number }>(PRODUCTS.map((p) => [p, { ap: 0, count: 0 }]));
  for (const p of inRange) {
    const b = buckets.get(p.product);
    if (!b) continue;
    b.ap += p.annualPremium;
    b.count += 1;
  }

  return PRODUCTS.map((product) => {
    const b = buckets.get(product)!;
    return { product, ap: b.ap, count: b.count, avgCaseSize: b.count > 0 ? b.ap / b.count : 0 };
  });
}

export function demoPolicyStatusAnalytics(policies: DemoPolicy[], range: DashboardRange, now: Date = new Date()) {
  const { since } = windowFor(range, now);
  const inRange = policies.filter((p) => !since || p.submittedAt >= since);

  const counts = new Map<string, number>(POLICY_STATUSES.map((s) => [s, 0]));
  for (const p of inRange) counts.set(p.status, (counts.get(p.status) ?? 0) + 1);

  const total = inRange.length;
  const breakdown = POLICY_STATUSES.map((status) => ({
    status,
    count: counts.get(status) ?? 0,
    percent: total > 0 ? ((counts.get(status) ?? 0) / total) * 100 : 0,
  }));

  const conversionRate = total > 0 ? (counts.get("ISSUED") ?? 0) / total : 0;

  return { breakdown, conversionRate, total };
}

/** All-time issued totals — what the Leaderboard cares about. */
export function demoLeaderboardTotals(policies: DemoPolicy[]) {
  const issued = policies.filter((p) => p.status === "ISSUED");
  return {
    issuedAP: issued.reduce((sum, p) => sum + p.annualPremium, 0),
    issuedCount: issued.length,
  };
}

/** Shapes the fake set as the same rows GET /api/portal/policies returns, for Book of Business. */
export function demoPoliciesAsApiRows(policies: DemoPolicy[], agentName: string) {
  return policies.map((p) => ({
    id: p.id,
    clientName: p.clientName,
    clientPhone: p.clientPhone,
    state: p.state,
    carrier: p.carrier,
    product: p.product,
    annualPremium: p.annualPremium.toFixed(2),
    status: p.status,
    submittedAt: p.submittedAt.toISOString(),
    issuedAt: p.issuedAt ? p.issuedAt.toISOString() : null,
    agent: { name: agentName },
  }));
}
