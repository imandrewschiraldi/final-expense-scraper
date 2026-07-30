import { differenceInCalendarDays, addDays, startOfDay } from "date-fns";
import { db } from "@/lib/db";
import { computeMetrics, computePreviousMetrics } from "@/lib/dashboardMetrics";
import { DateRange, rangeStart } from "@/lib/dashboardMetricsShared";
import { PersonalKpiData } from "@/lib/personalDashboardShared";

export * from "@/lib/personalDashboardShared";

const TERMINAL_STATUSES = ["CHARGEBACK"] as const;

/** Batches every Personal KPI card into a small, parallel set of indexed queries. */
export async function computePersonalKpis(userId: string, now: Date = new Date()): Promise<PersonalKpiData> {
  const scope = { agentId: userId };
  const ranges: DateRange[] = ["daily", "wtd", "mtd", "ytd"];

  const [
    [dailyM, weeklyM, monthlyM, yearlyM],
    [prevDailyM, prevWeeklyM, prevMonthlyM, prevYearlyM],
    statusGroups,
    activeGoals,
    rank,
  ] = await Promise.all([
    Promise.all(ranges.map((r) => computeMetrics(scope, r, now))),
    Promise.all(ranges.map((r) => computePreviousMetrics(scope, r, now))),
    db.policy.groupBy({
      by: ["status"],
      where: { agentId: userId },
      _sum: { annualPremium: true },
      _count: { _all: true },
    }),
    activeGoalsFor(userId, now),
    organizationRank(userId, now),
  ]);

  const statusSum = (status: string) =>
    Number(statusGroups.find((g) => g.status === status)?._sum.annualPremium ?? 0);
  const activePolicies = statusGroups
    .filter((g) => !TERMINAL_STATUSES.includes(g.status as (typeof TERMINAL_STATUSES)[number]))
    .reduce((sum, g) => sum + g._count._all, 0);

  const goalCompletion =
    activeGoals.length === 0
      ? undefined
      : activeGoals.reduce((sum, g) => sum + Math.min(100, g.percent), 0) / activeGoals.length;

  return {
    todayAP: { value: dailyM.submittedAP, previousValue: prevDailyM.submittedAP },
    weeklyAP: { value: weeklyM.submittedAP, previousValue: prevWeeklyM.submittedAP },
    monthlyAP: { value: monthlyM.submittedAP, previousValue: prevMonthlyM.submittedAP },
    yearlyAP: { value: yearlyM.submittedAP, previousValue: prevYearlyM.submittedAP },
    issuedPremium: { value: statusSum("ISSUED") },
    chargebackPremium: { value: statusSum("CHARGEBACK") },
    policiesSubmitted: { value: monthlyM.submittedCount, previousValue: prevMonthlyM.submittedCount },
    activePolicies: { value: activePolicies },
    avgCaseSize: { value: monthlyM.avgIssuedPremium, previousValue: prevMonthlyM.avgIssuedPremium },
    ...(goalCompletion !== undefined ? { goalCompletionPercentage: { value: goalCompletion } } : {}),
    ...(rank ? { organizationRank: { value: rank.rank } } : {}),
  };
}

async function organizationRank(userId: string, now: Date) {
  const rows = await computeIssuedApByAgent(now);
  if (rows.length === 0) return null;
  const sorted = [...rows].sort((a, b) => b.issuedAP - a.issuedAP);
  const idx = sorted.findIndex((r) => r.agentId === userId);
  if (idx === -1) return null;
  return { rank: idx + 1, of: sorted.length };
}

async function computeIssuedApByAgent(now: Date) {
  const since = rangeStart("mtd", now);
  const [agents, policies] = await Promise.all([
    db.user.findMany({ where: { active: true, role: { in: ["AGENT", "MANAGER"] } }, select: { id: true } }),
    db.policy.findMany({
      where: { status: "ISSUED", issuedAt: { gte: since }, agentId: { not: null } },
      select: { agentId: true, annualPremium: true },
    }),
  ]);
  const sums = new Map<string, number>();
  for (const a of agents) sums.set(a.id, 0);
  for (const p of policies) {
    if (!p.agentId) continue;
    sums.set(p.agentId, (sums.get(p.agentId) ?? 0) + Number(p.annualPremium));
  }
  return Array.from(sums.entries()).map(([agentId, issuedAP]) => ({ agentId, issuedAP }));
}

// --- Goal progress + pace math ---
// (Internal Date-based shape — the shared `GoalWithProgress` type used by
// client components has string dates, since that's what survives the API's
// JSON.stringify boundary.)

type GoalProgressInternal = {
  id: string;
  category: string;
  targetValue: number;
  periodStart: Date;
  periodEnd: Date;
  achievedAt: Date | null;
  currentValue: number;
  percent: number;
  remaining: number;
  requiredDailyPace: number;
  requiredWeeklyPace: number;
  projectedCompletionDate: Date | null;
};

function parseCompLevelPercent(compLevel: string | null): number | null {
  if (!compLevel) return null;
  const match = compLevel.match(/(\d+(?:\.\d+)?)\s*%/);
  if (!match) return null;
  const pct = Number(match[1]);
  return Number.isFinite(pct) ? pct / 100 : null;
}

async function currentGoalValue(
  userId: string,
  category: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<{ value: number; incomeApproximate: boolean }> {
  const window = { gte: periodStart, lte: periodEnd };

  switch (category) {
    case "MONTHLY_AP":
    case "ANNUAL_AP": {
      const agg = await db.policy.aggregate({
        where: { agentId: userId, submittedAt: window },
        _sum: { annualPremium: true },
      });
      return { value: Number(agg._sum.annualPremium ?? 0), incomeApproximate: false };
    }
    case "ISSUED_PREMIUM": {
      const agg = await db.policy.aggregate({
        where: { agentId: userId, status: "ISSUED", issuedAt: window },
        _sum: { annualPremium: true },
      });
      return { value: Number(agg._sum.annualPremium ?? 0), incomeApproximate: false };
    }
    case "POLICY_COUNT": {
      const count = await db.policy.count({ where: { agentId: userId, submittedAt: window } });
      return { value: count, incomeApproximate: false };
    }
    case "INCOME": {
      const [agg, user] = await Promise.all([
        db.policy.aggregate({
          where: { agentId: userId, status: "ISSUED", issuedAt: window },
          _sum: { annualPremium: true },
        }),
        db.user.findUnique({ where: { id: userId }, select: { compLevel: true } }),
      ]);
      const issuedAP = Number(agg._sum.annualPremium ?? 0);
      const pct = parseCompLevelPercent(user?.compLevel ?? null);
      return { value: issuedAP * (pct ?? 1), incomeApproximate: pct === null };
    }
    case "RECRUITING":
    default:
      return { value: 0, incomeApproximate: false };
  }
}

function withPace(goal: {
  id: string;
  category: string;
  targetValue: number;
  periodStart: Date;
  periodEnd: Date;
  achievedAt: Date | null;
  currentValue: number;
}, now: Date): GoalProgressInternal {
  const percent = goal.targetValue > 0 ? Math.min(100, (goal.currentValue / goal.targetValue) * 100) : 0;
  const remaining = Math.max(0, goal.targetValue - goal.currentValue);
  const daysRemaining = Math.max(0, differenceInCalendarDays(goal.periodEnd, now));
  const daysElapsed = Math.max(1, differenceInCalendarDays(now, goal.periodStart) + 1);

  const requiredDailyPace = daysRemaining > 0 ? remaining / daysRemaining : remaining;
  const requiredWeeklyPace = requiredDailyPace * 7;

  const runRate = goal.currentValue / daysElapsed;
  let projectedCompletionDate: Date | null = null;
  if (runRate > 0 && remaining > 0) {
    const daysNeeded = goal.targetValue / runRate;
    projectedCompletionDate = addDays(startOfDay(goal.periodStart), Math.ceil(daysNeeded));
  } else if (remaining <= 0) {
    projectedCompletionDate = now;
  }

  return { ...goal, percent, remaining, requiredDailyPace, requiredWeeklyPace, projectedCompletionDate };
}

export async function activeGoalsFor(userId: string, now: Date = new Date()): Promise<GoalProgressInternal[]> {
  const goals = await db.goal.findMany({
    where: { userId, achievedAt: null, periodEnd: { gte: startOfDay(now) } },
    orderBy: { periodEnd: "asc" },
  });

  return Promise.all(
    goals.map(async (g) => {
      const { value } = await currentGoalValue(userId, g.category, g.periodStart, g.periodEnd);
      return withPace(
        {
          id: g.id,
          category: g.category,
          targetValue: Number(g.targetValue),
          periodStart: g.periodStart,
          periodEnd: g.periodEnd,
          achievedAt: g.achievedAt,
          currentValue: value,
        },
        now,
      );
    }),
  );
}

export async function recentWinsFor(userId: string, limit = 6) {
  return db.goal.findMany({
    where: { userId, achievedAt: { not: null } },
    orderBy: { achievedAt: "desc" },
    take: limit,
  });
}

/**
 * Re-checks every active goal for a user and marks any that have crossed
 * 100% as achieved, firing a GOAL_ACHIEVED notification the first time.
 * Called after any policy create/status-change that could move progress —
 * there's no cron/scheduler in this app, so this is the goal-completion
 * trigger point.
 */
export async function checkAndAwardGoals(userId: string, now: Date = new Date()) {
  const goals = await db.goal.findMany({
    where: { userId, achievedAt: null, periodEnd: { gte: startOfDay(now) } },
  });

  for (const g of goals) {
    const { value } = await currentGoalValue(userId, g.category, g.periodStart, g.periodEnd);
    if (value >= Number(g.targetValue)) {
      await db.$transaction([
        db.goal.update({ where: { id: g.id }, data: { achievedAt: now } }),
        db.notification.create({
          data: {
            userId,
            type: "GOAL_ACHIEVED",
            payload: { goalId: g.id, category: g.category, targetValue: Number(g.targetValue) },
          },
        }),
      ]);
    }
  }
}
