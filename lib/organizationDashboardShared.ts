// Client-safe constants/types for the Organization Dashboard — no `db`
// import, so client components can pull these in without bundling Prisma/pg.

export const ORG_KPI_KEYS = [
  "totalAnnualPremium",
  "totalIssuedPremium",
  "totalChargebackPremium",
  "totalPoliciesSubmitted",
  "avgCaseSize",
  "activeAgents",
] as const;
export type OrgKpiKey = (typeof ORG_KPI_KEYS)[number];

export const ORG_KPI_META: Record<OrgKpiKey, { label: string; format: "currency" | "count"; explain: string }> = {
  totalAnnualPremium: { label: "Annual Premium", format: "currency", explain: "Org-wide annual premium submitted in the selected timeframe." },
  totalIssuedPremium: { label: "Issued Premium", format: "currency", explain: "Of that, annual premium currently marked Issued." },
  totalChargebackPremium: { label: "Chargeback Premium", format: "currency", explain: "Of that, annual premium currently marked Chargeback." },
  totalPoliciesSubmitted: { label: "Policies Submitted", format: "count", explain: "Policies submitted org-wide in the selected timeframe." },
  avgCaseSize: { label: "Average Case Size", format: "currency", explain: "Average annual premium of policies issued in the selected timeframe." },
  activeAgents: { label: "Active Agents", format: "count", explain: "Currently active agents and managers." },
};

export type OrgKpiData = Partial<Record<OrgKpiKey, { value: number; previousValue?: number }>>;

export type TopProducer = { id: string; name: string; profileImageUrl: string | null; issuedAP: number; issuedCount: number };

export type RecentActivityItem = {
  id: string;
  agentName: string | null;
  carrier: string;
  product: string | null;
  annualPremium: number;
  status: string;
  submittedAt: string;
};
