export type NotificationRecord = {
  id: string;
  type: string;
  payload: { count?: number; category?: string; targetValue?: number };
  read: boolean;
  createdAt: string;
};

const GOAL_CATEGORY_LABELS: Record<string, string> = {
  MONTHLY_AP: "Monthly Annual Premium",
  ANNUAL_AP: "Annual Premium",
  ISSUED_PREMIUM: "Issued Premium",
  POLICY_COUNT: "Policy Count",
  INCOME: "Income",
  RECRUITING: "Recruiting",
};

export function notificationMessage(n: NotificationRecord) {
  if (n.type === "GOAL_ACHIEVED") {
    const label = GOAL_CATEGORY_LABELS[n.payload?.category ?? ""] ?? "Goal";
    return `${label} goal reached`;
  }
  return `${n.payload?.count ?? ""} new lead${n.payload?.count === 1 ? "" : "s"} assigned to you`;
}
