import { LEAD_STATUS_COLORS, LEAD_STATUS_LABELS, LeadStatus } from "@/lib/leadStatus";
import { cn } from "@/lib/cn";

export function StatusBadge({ status }: { status: LeadStatus }) {
  const colors = LEAD_STATUS_COLORS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide",
        colors.bg,
        colors.text,
        colors.border,
      )}
    >
      {LEAD_STATUS_LABELS[status]}
    </span>
  );
}
