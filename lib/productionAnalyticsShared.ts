export const ANALYTICS_RANGES = ["daily", "weekly", "monthly", "ytd", "all"] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

export const ANALYTICS_RANGE_LABELS: Record<AnalyticsRange, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  ytd: "YTD",
  all: "All",
};
