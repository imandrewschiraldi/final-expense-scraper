export const TIMELINE_GRANULARITIES = ["daily", "weekly", "monthly", "yearly"] as const;
export type TimelineGranularity = (typeof TIMELINE_GRANULARITIES)[number];
