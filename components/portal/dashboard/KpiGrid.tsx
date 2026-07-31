"use client";

import { motion } from "motion/react";
import {
  Wallet,
  FileCheck2,
  FileX2,
  FileText,
  ShieldCheck,
  DollarSign,
  Target,
  Flag,
  ArrowUpRight,
  ArrowDownRight,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { PremiumPanel } from "@/components/portal/dashboard/PremiumPanel";
import { useCountUp } from "@/lib/useCountUp";
import { PERSONAL_KPI_KEYS, PERSONAL_KPI_META, PersonalKpiData, PersonalKpiKey } from "@/lib/personalDashboardShared";

const KPI_ICONS: Record<PersonalKpiKey, LucideIcon> = {
  annualPremium: Wallet,
  issuedPremium: FileCheck2,
  chargebackPremium: FileX2,
  policiesSubmitted: FileText,
  activePolicies: ShieldCheck,
  avgCaseSize: DollarSign,
  goalCompletionPercentage: Target,
  goalRemaining: Flag,
};

function formatKpiValue(format: "currency" | "count" | "percent", value: number | undefined) {
  if (value === undefined) return "—";
  if (format === "currency") {
    return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  }
  if (format === "percent") return `${value.toFixed(0)}%`;
  return Math.round(value).toLocaleString("en-US");
}

function DeltaBadge({ value, previousValue }: { value: number | undefined; previousValue: number | undefined }) {
  if (value === undefined || previousValue === undefined || previousValue === 0) return null;
  const change = ((value - previousValue) / previousValue) * 100;
  if (!Number.isFinite(change) || Math.round(change) === 0) return null;
  const isUp = change > 0;
  const Icon = isUp ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("flex items-center gap-0.5 text-xs font-semibold", isUp ? "text-green-light" : "text-red-light")}>
      <Icon className="h-3.5 w-3.5" />
      {Math.abs(change).toFixed(0)}%
    </span>
  );
}

type KpiEntry = { value: number; previousValue?: number; label?: string; format?: "currency" | "count" | "percent" };

function KpiCard({ index, kpiKey, entry }: { index: number; kpiKey: PersonalKpiKey; entry: KpiEntry | undefined }) {
  const animated = useCountUp(entry?.value);
  const Icon = KPI_ICONS[kpiKey];
  const meta = PERSONAL_KPI_META[kpiKey];
  const label = entry?.label ?? meta.label;
  const format = entry?.format ?? meta.format;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.035, 0.35), ease: "easeOut" }}
      whileHover={{ y: -2 }}
      title={meta.explain}
    >
      <PremiumPanel className="h-full p-4 transition-colors duration-200 hover:border-copper-dim">
        <div className="flex items-center justify-between">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-copper/10">
            <Icon className="h-4.5 w-4.5 text-copper" />
          </div>
          <DeltaBadge value={entry?.value} previousValue={entry?.previousValue} />
        </div>
        <p className="mt-3 truncate text-[13px] text-muted">{label}</p>
        <p className="mt-0.5 text-[26px] leading-tight font-bold text-white">{formatKpiValue(format, animated)}</p>
      </PremiumPanel>
    </motion.div>
  );
}

export function KpiGrid({ data }: { data: PersonalKpiData }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {PERSONAL_KPI_KEYS.map((key, index) => (
        <KpiCard key={key} index={index} kpiKey={key} entry={data[key]} />
      ))}
    </div>
  );
}
