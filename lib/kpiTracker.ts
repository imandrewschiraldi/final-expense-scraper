// Pure types, date math, and rate formulas for the KPI Tracker — no `db`
// import, so this is safe for client bundles (same reasoning as
// lib/dashboardRange.ts). The actual Prisma-backed queries live in
// lib/kpiTrackerServer.ts instead; importing them here would pull
// @prisma/adapter-pg's Node-only internals (dns/fs/net/tls) into every
// client component that just wants a type or a date helper.

// All dates in this module are plain "yyyy-MM-dd" calendar-day strings —
// never ambiguous local-vs-server-timezone Dates. The browser computes
// "today" from the agent's own clock and always sends it explicitly; the
// server never guesses a day on its own. Conversions to/from Prisma's
// @db.Date column go through parseKpiDate/formatKpiDate below, both of
// which work in UTC fields only (getUTCDate, toISOString) so they can't
// drift a day depending on which timezone the server process happens to
// be running in.

export const MAX_LEAD_SPEND = 10000;

export function parseKpiDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

export function formatKpiDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function mondayOfWeek(dateStr: string): string {
  const d = parseKpiDate(dateStr);
  const dow = d.getUTCDay();
  const diff = dow === 0 ? 6 : dow - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  return formatKpiDate(d);
}

export function addDaysToKpiDate(dateStr: string, days: number): string {
  const d = parseKpiDate(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return formatKpiDate(d);
}

export function firstOfMonth(dateStr: string): string {
  return `${dateStr.slice(0, 7)}-01`;
}

export function lastOfMonth(dateStr: string): string {
  const d = parseKpiDate(firstOfMonth(dateStr));
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(d.getUTCDate() - 1);
  return formatKpiDate(d);
}

export function addMonthsToKpiDate(dateStr: string, months: number): string {
  const d = parseKpiDate(dateStr);
  d.setUTCMonth(d.getUTCMonth() + months);
  return formatKpiDate(d);
}

export const KPI_SUMMARY_RANGES = [
  "this_week",
  "last_week",
  "this_month",
  "last_month",
  "custom",
] as const;
export type KpiSummaryRange = (typeof KPI_SUMMARY_RANGES)[number];

export const KPI_SUMMARY_RANGE_LABELS: Record<KpiSummaryRange, string> = {
  this_week: "This Week",
  last_week: "Last Week",
  this_month: "This Month",
  last_month: "Last Month",
  custom: "Custom Range",
};

/** Resolves a named period (or an explicit custom range) into concrete
 *  "yyyy-MM-dd" bounds, as of the given `today` — always computed by the
 *  caller from their own clock, never guessed here (same reasoning as
 *  everywhere else in this module). */
export function kpiSummaryRangeBounds(
  range: KpiSummaryRange,
  today: string,
  custom?: { from: string; to: string },
): { from: string; to: string } {
  switch (range) {
    case "this_week": {
      const start = mondayOfWeek(today);
      return { from: start, to: addDaysToKpiDate(start, 6) };
    }
    case "last_week": {
      const start = addDaysToKpiDate(mondayOfWeek(today), -7);
      return { from: start, to: addDaysToKpiDate(start, 6) };
    }
    case "this_month":
      return { from: firstOfMonth(today), to: lastOfMonth(today) };
    case "last_month": {
      const lastMonthDay = addMonthsToKpiDate(firstOfMonth(today), -1);
      return {
        from: firstOfMonth(lastMonthDay),
        to: lastOfMonth(lastMonthDay),
      };
    }
    case "custom":
      return custom ?? { from: today, to: today };
  }
}

export type KpiDailyInput = {
  deposits?: number;
  leadSpend?: number;
  hoursWorked?: number;
  apptsScheduled?: number;
  dials?: number;
  answered?: number;
  apptsShown?: number;
  presentations?: number;
  dealsClosed?: number;
};

export type KpiDailyTotals = Required<KpiDailyInput> & {
  date: string;
  apSubmitted: number;
};

export type KpiRates = {
  pickupRate: number | null;
  showRate: number | null;
  closeRate: number | null;
  apPerDay: number | null;
};

export function emptyKpiTotals(): Omit<KpiDailyTotals, "date"> {
  return {
    deposits: 0,
    leadSpend: 0,
    hoursWorked: 0,
    apptsScheduled: 0,
    dials: 0,
    answered: 0,
    apptsShown: 0,
    presentations: 0,
    dealsClosed: 0,
    apSubmitted: 0,
  };
}

export function computeKpiRates(totals: {
  dials: number;
  answered: number;
  apptsScheduled: number;
  apptsShown: number;
  presentations: number;
  dealsClosed: number;
  apSubmitted: number;
  daysActive: number;
}): KpiRates {
  return {
    pickupRate: totals.dials > 0 ? totals.answered / totals.dials : null,
    showRate:
      totals.apptsScheduled > 0
        ? totals.apptsShown / totals.apptsScheduled
        : null,
    closeRate:
      totals.presentations > 0
        ? totals.dealsClosed / totals.presentations
        : null,
    apPerDay:
      totals.daysActive > 0 ? totals.apSubmitted / totals.daysActive : null,
  };
}

export type KpiPeriodSummary = Omit<KpiDailyTotals, "date"> & {
  daysActive: number;
  rates: KpiRates;
};

export type KpiWeekTotals = Omit<KpiDailyTotals, "date"> & {
  weekStart: string;
  weekEnd: string;
  loggedDays: number;
  days: KpiDailyTotals[];
  rates: KpiRates;
};

export type AgentKpiTeamRow = {
  agentId: string;
  name: string;
  daysActive: number;
} & Omit<KpiDailyTotals, "date"> & { rates: KpiRates };
