import { differenceInCalendarDays, addDays, startOfDay } from "date-fns";
import { db } from "@/lib/db";
import { DashboardRange, rangeSince, previousRangeWindow } from "@/lib/dashboardRange";
import { PersonalKpiData, GOAL_CATEGORY_LABELS, GOAL_CATEGORY_FORMAT } from "@/lib/personalDashboardShared";

export * from "@/lib/personalDashboardShared";

export type WindowMetrics = {
  submittedAP: number;
  submittedCount: number;
  issuedAP: number;
  issuedCount: number;
  chargebackAP: number;
  activeCount: number;
  avgCaseSize: number;
};

/** `agentId: null` scopes org-wide instead of to one agent — shared by the personal and organization dashboards. */
export async function metricsForWindow(agentId: string | null, window: { gte?: Date; lt?: Date }): Promise<WindowMetrics> {
  const hasBound = window.gte !== undefined || window.lt !== undefined;
  const statusGroups = await db.policy.groupBy({
    by: ["status"],
    where: { ...(agentId ? { agentId } : {}), ...(hasBound ? { submittedAt: window } : {}) },
    _sum: { annualPremium: true },
    _count: { _all: true },
  });

  const sumFor = (s: string) => Number(statusGroups.find((g) => g.status === s)?._sum.annualPremium ?? 0);
  const countFor = (s: string) => statusGroups.find((g) => g.status === s)?._count._all ?? 0;

  const submittedAP = statusGroups.reduce((sum, g) => sum + Number(g._sum.annualPremium ?? 0), 0);
  const submittedCount = statusGroups.reduce((sum, g) => sum + g._count._all, 0);
  const issuedAP = sumFor("ISSUED");
  const issuedCount = countFor("ISSUED");
  const chargebackAP = sumFor("CHARGEBACK");
  const activeCount = submittedCount - countFor("CHARGEBACK");

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

/** Batches every Personal KPI card into a small, parallel set of indexed queries, all scoped to the one selected range. */
export async function computePersonalKpis(userId: string, range: DashboardRange, now: Date = new Date()): Promise<PersonalKpiData> {
  const since = rangeSince(range, now);
  const prev = previousRangeWindow(range, now);

  const [current, previous, activeGoals] = await Promise.all([
    metricsForWindow(userId, since ? { gte: since } : {}),
    prev ? metricsForWindow(userId, { gte: prev.start, lt: prev.end }) : Promise.resolve(null),
    activeGoalsFor(userId, now),
  ]);

  const goalCompletion =
    activeGoals.length === 0
      ? undefined
      : activeGoals.reduce((sum, g) => sum + Math.min(100, g.percent), 0) / activeGoals.length;

  // activeGoalsFor orders by soonest deadline first, so the first entry is
  // the goal a user should be paying attention to right now.
  const primaryGoal = activeGoals[0];

  const withTrend = (value: number, previousValue: number | undefined) =>
    previousValue !== undefined ? { value, previousValue } : { value };

  return {
    annualPremium: withTrend(current.submittedAP, previous?.submittedAP),
    issuedPremium: withTrend(current.issuedAP, previous?.issuedAP),
    chargebackPremium: withTrend(current.chargebackAP, previous?.chargebackAP),
    policiesSubmitted: withTrend(current.submittedCount, previous?.submittedCount),
    activePolicies: withTrend(current.activeCount, previous?.activeCount),
    avgCaseSize: withTrend(current.avgCaseSize, previous?.avgCaseSize),
    ...(goalCompletion !== undefined ? { goalCompletionPercentage: { value: goalCompletion } } : {}),
    ...(primaryGoal
      ? {
          goalRemaining: {
            value: primaryGoal.remaining,
            label: `${GOAL_CATEGORY_LABELS[primaryGoal.category] ?? "Goal"} Remaining`,
            format: GOAL_CATEGORY_FORMAT[primaryGoal.category] ?? "currency",
          },
        }
      : {}),
  };
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
