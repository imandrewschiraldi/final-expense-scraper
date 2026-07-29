import { startOfDay, startOfMonth, startOfYear, startOfWeek } from "date-fns";

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
