import { db } from "@/lib/db";
import { rangeSince, type DashboardRange } from "@/lib/dashboardRange";
import {
  parseKpiDate,
  formatKpiDate,
  mondayOfWeek,
  addDaysToKpiDate,
  emptyKpiTotals,
  computeKpiRates,
  type KpiDailyInput,
  type KpiDailyTotals,
  type KpiPeriodSummary,
  type KpiWeekTotals,
  type AgentKpiTeamRow,
} from "@/lib/kpiTracker";

/** AP submitted per calendar day for an agent, computed live from real
 *  Policy submissions (never stored on KpiEntry) — keyed by "yyyy-MM-dd". */
async function getApSubmittedByDay(
  agentId: string,
  from: Date,
  to: Date,
): Promise<Map<string, number>> {
  const until = new Date(to);
  until.setUTCDate(until.getUTCDate() + 1);
  const policies = await db.policy.findMany({
    where: { agentId, submittedAt: { gte: from, lt: until } },
    select: { annualPremium: true, submittedAt: true },
  });
  const byDay = new Map<string, number>();
  for (const p of policies) {
    const key = formatKpiDate(p.submittedAt);
    byDay.set(key, (byDay.get(key) ?? 0) + Number(p.annualPremium));
  }
  return byDay;
}

async function getApSubmittedForDay(
  agentId: string,
  dateStr: string,
): Promise<number> {
  const start = parseKpiDate(dateStr);
  const end = parseKpiDate(addDaysToKpiDate(dateStr, 1));
  const result = await db.policy.aggregate({
    where: { agentId, submittedAt: { gte: start, lt: end } },
    _sum: { annualPremium: true },
  });
  return Number(result._sum.annualPremium ?? 0);
}

function toDailyTotals(
  entry: {
    date: Date;
    deposits: unknown;
    leadSpend: unknown;
    hoursWorked: unknown;
    apptsScheduled: number;
    dials: number;
    answered: number;
    apptsShown: number;
    presentations: number;
    dealsClosed: number;
  } | null,
  dateStr: string,
  apSubmitted: number,
): KpiDailyTotals {
  if (!entry) return { date: dateStr, ...emptyKpiTotals(), apSubmitted };
  return {
    date: dateStr,
    deposits: Number(entry.deposits),
    leadSpend: Number(entry.leadSpend),
    hoursWorked: Number(entry.hoursWorked),
    apptsScheduled: entry.apptsScheduled,
    dials: entry.dials,
    answered: entry.answered,
    apptsShown: entry.apptsShown,
    presentations: entry.presentations,
    dealsClosed: entry.dealsClosed,
    apSubmitted,
  };
}

/** One day's editable entry plus its live, read-only AP total — what the
 *  "My Tracker" tab's Log activity card is built from. */
export async function getDailyEntry(
  agentId: string,
  dateStr: string,
): Promise<KpiDailyTotals> {
  const [entry, apSubmitted] = await Promise.all([
    db.kpiEntry.findUnique({
      where: { agentId_date: { agentId, date: parseKpiDate(dateStr) } },
    }),
    getApSubmittedForDay(agentId, dateStr),
  ]);
  return toDailyTotals(entry, dateStr, apSubmitted);
}

/** Upserts whichever fields are present in `patch` for an agent's day —
 *  "Changes save automatically" means each field change is its own call. */
export async function upsertDailyEntry(
  agentId: string,
  dateStr: string,
  patch: KpiDailyInput,
): Promise<void> {
  const data: Record<string, number> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) data[key] = value;
  }
  if (Object.keys(data).length === 0) return;

  await db.kpiEntry.upsert({
    where: { agentId_date: { agentId, date: parseKpiDate(dateStr) } },
    create: { agentId, date: parseKpiDate(dateStr), ...data },
    update: data,
  });
}

/** Totals + rates over an explicit [from, to] window of calendar days
 *  (inclusive) — the Period summary card below the daily log. The caller
 *  resolves a named period (This Week, Last Month, etc) or a custom range
 *  into these concrete bounds via kpiSummaryRangeBounds; this function
 *  doesn't know about period names at all. */
export async function getPeriodSummary(
  agentId: string,
  from: string,
  to: string,
): Promise<KpiPeriodSummary> {
  const entries = await db.kpiEntry.findMany({
    where: {
      agentId,
      date: { gte: parseKpiDate(from), lte: parseKpiDate(to) },
    },
    orderBy: { date: "asc" },
  });

  const totals = emptyKpiTotals();
  if (entries.length > 0) {
    const apByDay = await getApSubmittedByDay(
      agentId,
      entries[0].date,
      entries[entries.length - 1].date,
    );
    for (const entry of entries) {
      const dateStr = formatKpiDate(entry.date);
      totals.deposits += Number(entry.deposits);
      totals.leadSpend += Number(entry.leadSpend);
      totals.hoursWorked += Number(entry.hoursWorked);
      totals.apptsScheduled += entry.apptsScheduled;
      totals.dials += entry.dials;
      totals.answered += entry.answered;
      totals.apptsShown += entry.apptsShown;
      totals.presentations += entry.presentations;
      totals.dealsClosed += entry.dealsClosed;
      totals.apSubmitted += apByDay.get(dateStr) ?? 0;
    }
  }

  const daysActive = entries.length;
  return {
    ...totals,
    daysActive,
    rates: computeKpiRates({ ...totals, daysActive }),
  };
}

/** Every week the agent has at least one logged day, newest first — the
 *  "My History" tab's Entry history table. */
export async function getWeeklyHistory(
  agentId: string,
): Promise<KpiWeekTotals[]> {
  const entries = await db.kpiEntry.findMany({
    where: { agentId },
    orderBy: { date: "asc" },
  });
  if (entries.length === 0) return [];

  const apByDay = await getApSubmittedByDay(
    agentId,
    entries[0].date,
    entries[entries.length - 1].date,
  );

  const weeks = new Map<string, KpiWeekTotals>();
  for (const entry of entries) {
    const dateStr = formatKpiDate(entry.date);
    const weekStart = mondayOfWeek(dateStr);
    const day = toDailyTotals(entry, dateStr, apByDay.get(dateStr) ?? 0);

    const week = weeks.get(weekStart) ?? {
      weekStart,
      weekEnd: addDaysToKpiDate(weekStart, 6),
      loggedDays: 0,
      days: [],
      ...emptyKpiTotals(),
      rates: {
        pickupRate: null,
        showRate: null,
        closeRate: null,
        apPerDay: null,
      },
    };
    week.loggedDays += 1;
    week.days.push(day);
    week.deposits += day.deposits;
    week.leadSpend += day.leadSpend;
    week.hoursWorked += day.hoursWorked;
    week.apptsScheduled += day.apptsScheduled;
    week.dials += day.dials;
    week.answered += day.answered;
    week.apptsShown += day.apptsShown;
    week.presentations += day.presentations;
    week.dealsClosed += day.dealsClosed;
    week.apSubmitted += day.apSubmitted;
    weeks.set(weekStart, week);
  }

  const result = Array.from(weeks.values());
  for (const week of result) {
    week.rates = computeKpiRates({ ...week, daysActive: week.loggedDays });
  }
  return result.sort((a, b) => b.weekStart.localeCompare(a.weekStart));
}

/** Every agent's totals + rates for one period — the admin team view. */
export async function getTeamKpiSummary(
  range: DashboardRange,
  now: Date = new Date(),
): Promise<AgentKpiTeamRow[]> {
  const since = rangeSince(range, now);
  const [entries, agents] = await Promise.all([
    db.kpiEntry.findMany({
      where: since ? { date: { gte: since } } : {},
      orderBy: { date: "asc" },
    }),
    db.user.findMany({
      where: { role: { in: ["AGENT", "MANAGER"] }, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  if (entries.length === 0) {
    return agents.map((a) => ({
      agentId: a.id,
      name: a.name,
      daysActive: 0,
      ...emptyKpiTotals(),
      rates: computeKpiRates({ ...emptyKpiTotals(), daysActive: 0 }),
    }));
  }

  const minDate = entries[0].date;
  const maxDate = entries[entries.length - 1].date;
  const apByAgentDay = new Map<string, number>();
  {
    const policies = await db.policy.findMany({
      where: {
        agentId: { in: agents.map((a) => a.id) },
        submittedAt: {
          gte: minDate,
          lt: parseKpiDate(addDaysToKpiDate(formatKpiDate(maxDate), 1)),
        },
      },
      select: { agentId: true, annualPremium: true, submittedAt: true },
    });
    for (const p of policies) {
      if (!p.agentId) continue;
      const key = `${p.agentId}:${formatKpiDate(p.submittedAt)}`;
      apByAgentDay.set(
        key,
        (apByAgentDay.get(key) ?? 0) + Number(p.annualPremium),
      );
    }
  }

  const byAgent = new Map<
    string,
    Omit<KpiDailyTotals, "date"> & { daysActive: number }
  >();
  for (const entry of entries) {
    const dateStr = formatKpiDate(entry.date);
    const apSubmitted = apByAgentDay.get(`${entry.agentId}:${dateStr}`) ?? 0;
    const row = byAgent.get(entry.agentId) ?? {
      ...emptyKpiTotals(),
      daysActive: 0,
    };
    row.daysActive += 1;
    row.deposits += Number(entry.deposits);
    row.leadSpend += Number(entry.leadSpend);
    row.hoursWorked += Number(entry.hoursWorked);
    row.apptsScheduled += entry.apptsScheduled;
    row.dials += entry.dials;
    row.answered += entry.answered;
    row.apptsShown += entry.apptsShown;
    row.presentations += entry.presentations;
    row.dealsClosed += entry.dealsClosed;
    row.apSubmitted += apSubmitted;
    byAgent.set(entry.agentId, row);
  }

  return agents.map((a) => {
    const totals = byAgent.get(a.id) ?? { ...emptyKpiTotals(), daysActive: 0 };
    return {
      agentId: a.id,
      name: a.name,
      ...totals,
      rates: computeKpiRates(totals),
    };
  });
}
