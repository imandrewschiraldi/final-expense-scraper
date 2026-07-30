import { startOfDay, startOfWeek, startOfMonth, startOfYear, subDays, subWeeks, subMonths, subYears } from "date-fns";

// The single time-range concept shared by the personal Dashboard's KPI cards
// and its Production Analytics section — one selector drives both, per the
// user's explicit request that everything on the page "match whatever
// timeframe is selected." No `db` import, so this is safe for client bundles.

export const DASHBOARD_RANGES = ["daily", "weekly", "monthly", "ytd", "all"] as const;
export type DashboardRange = (typeof DASHBOARD_RANGES)[number];

export const DASHBOARD_RANGE_LABELS: Record<DashboardRange, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  ytd: "YTD",
  all: "All",
};

/** Lower bound for the selected range, or null for "all" (no bound). */
export function rangeSince(range: DashboardRange, now: Date = new Date()): Date | null {
  switch (range) {
    case "daily":
      return startOfDay(now);
    case "weekly":
      return startOfWeek(now, { weekStartsOn: 1 });
    case "monthly":
      return startOfMonth(now);
    case "ytd":
      return startOfYear(now);
    case "all":
      return null;
  }
}

/**
 * The comparable prior window — same elapsed time into the equivalent prior
 * period (e.g. "8 days into this month" vs "8 days into last month") — for
 * KPI trend deltas. Returns null for "all" (there's no prior "all-time").
 */
export function previousRangeWindow(range: DashboardRange, now: Date = new Date()): { start: Date; end: Date } | null {
  const since = rangeSince(range, now);
  if (since === null) return null;
  const elapsedMs = now.getTime() - since.getTime();
  let start: Date;
  switch (range) {
    case "daily":
      start = subDays(since, 1);
      break;
    case "weekly":
      start = subWeeks(since, 1);
      break;
    case "monthly":
      start = subMonths(since, 1);
      break;
    case "ytd":
      start = subYears(since, 1);
      break;
    default:
      return null;
  }
  const end = new Date(start.getTime() + elapsedMs);
  return { start, end };
}
