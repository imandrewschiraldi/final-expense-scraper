// Client-safe constants/types for the personal dashboard — no `db` import,
// so client components can pull these in without bundling Prisma/pg.

export const PERSONAL_KPI_KEYS = [
  "todayAP",
  "weeklyAP",
  "monthlyAP",
  "yearlyAP",
  "issuedPremium",
  "chargebackPremium",
  "policiesSubmitted",
  "activePolicies",
  "avgCaseSize",
  "goalCompletionPercentage",
  "organizationRank",
] as const;
export type PersonalKpiKey = (typeof PERSONAL_KPI_KEYS)[number];

export const PERSONAL_KPI_META: Record<PersonalKpiKey, { label: string; format: "currency" | "count" | "percent" | "rank"; explain: string }> = {
  todayAP: { label: "Today's Annual Premium", format: "currency", explain: "Annual premium submitted today." },
  weeklyAP: { label: "Weekly Annual Premium", format: "currency", explain: "Annual premium submitted this week (Mon–now)." },
  monthlyAP: { label: "Monthly Annual Premium", format: "currency", explain: "Annual premium submitted this calendar month." },
  yearlyAP: { label: "Yearly Annual Premium", format: "currency", explain: "Annual premium submitted this calendar year." },
  issuedPremium: { label: "Issued Premium", format: "currency", explain: "Lifetime annual premium currently marked Issued." },
  chargebackPremium: { label: "Chargeback Premium", format: "currency", explain: "Lifetime annual premium currently marked Chargeback." },
  policiesSubmitted: { label: "Policies Submitted", format: "count", explain: "Policies submitted this calendar month." },
  activePolicies: { label: "Active Policies", format: "count", explain: "Submitted or Issued policies (not Chargeback)." },
  avgCaseSize: { label: "Average Case Size", format: "currency", explain: "Average annual premium of policies issued this month." },
  goalCompletionPercentage: { label: "Goal Completion", format: "percent", explain: "Average progress across your active goals." },
  organizationRank: { label: "Organization Rank", format: "rank", explain: "Your rank across the org by month-to-date issued premium." },
};

export type PersonalKpiData = Partial<Record<PersonalKpiKey, { value: number; previousValue?: number }>>;

export const GOAL_CATEGORIES = ["MONTHLY_AP", "ANNUAL_AP", "ISSUED_PREMIUM", "POLICY_COUNT", "INCOME", "RECRUITING"] as const;
export type GoalCategoryKey = (typeof GOAL_CATEGORIES)[number];

export const GOAL_CATEGORY_LABELS: Record<string, string> = {
  MONTHLY_AP: "Monthly Annual Premium",
  ANNUAL_AP: "Annual Premium",
  ISSUED_PREMIUM: "Issued Premium",
  POLICY_COUNT: "Policy Count",
  INCOME: "Income",
  RECRUITING: "Recruiting",
};

export const GOAL_CATEGORY_FORMAT: Record<string, "currency" | "count"> = {
  MONTHLY_AP: "currency",
  ANNUAL_AP: "currency",
  ISSUED_PREMIUM: "currency",
  POLICY_COUNT: "count",
  INCOME: "currency",
  RECRUITING: "count",
};

export type GoalWithProgress = {
  id: string;
  category: string;
  targetValue: number;
  periodStart: string;
  periodEnd: string;
  achievedAt: string | null;
  currentValue: number;
  percent: number;
  remaining: number;
  requiredDailyPace: number;
  requiredWeeklyPace: number;
  projectedCompletionDate: string | null;
};
