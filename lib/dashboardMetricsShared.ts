import { startOfDay, startOfMonth, startOfYear, startOfWeek, subDays, subWeeks, subMonths, subYears } from "date-fns";

export const DATE_RANGES = ["daily", "wtd", "mtd", "ytd"] as const;
export type DateRange = (typeof DATE_RANGES)[number];

export const DATE_RANGE_LABELS: Record<DateRange, string> = {
  daily: "Daily",
  wtd: "Week to Date",
  mtd: "Month to Date",
  ytd: "Year to Date",
};

export function rangeStart(range: DateRange, now: Date = new Date()): Date {
  switch (range) {
    case "daily":
      return startOfDay(now);
    case "wtd":
      return startOfWeek(now, { weekStartsOn: 1 });
    case "mtd":
      return startOfMonth(now);
    case "ytd":
      return startOfYear(now);
  }
}

function periodBack(date: Date, range: DateRange): Date {
  switch (range) {
    case "daily":
      return subDays(date, 1);
    case "wtd":
      return subWeeks(date, 1);
    case "mtd":
      return subMonths(date, 1);
    case "ytd":
      return subYears(date, 1);
  }
}

/**
 * The comparable prior window for a range — same elapsed time into the
 * period, one period back (e.g. "8 days into this month" vs "8 days into
 * last month"), not the full prior period. Keeps the KPI-card delta fair
 * against a range that's still in progress.
 */
export function comparisonWindow(range: DateRange, now: Date = new Date()): { start: Date; end: Date } {
  const currentStart = rangeStart(range, now);
  const elapsedMs = now.getTime() - currentStart.getTime();
  const start = periodBack(currentStart, range);
  const end = new Date(start.getTime() + elapsedMs);
  return { start, end };
}

export const METRICS = [
  "submittedCount",
  "submittedAP",
  "issuedCount",
  "issuedAP",
  "conversionRate",
  "avgIssuedPremium",
] as const;
export type MetricKey = (typeof METRICS)[number];

export const METRIC_LABELS: Record<MetricKey, string> = {
  submittedCount: "Policies Submitted",
  submittedAP: "Submitted AP",
  issuedCount: "Policies Issued",
  issuedAP: "Issued AP",
  conversionRate: "Conversion Rate",
  avgIssuedPremium: "Avg Issued Premium",
};

export const METRIC_FORMATS: Record<MetricKey, "currency" | "count" | "percent"> = {
  submittedCount: "count",
  submittedAP: "currency",
  issuedCount: "count",
  issuedAP: "currency",
  conversionRate: "percent",
  avgIssuedPremium: "currency",
};
