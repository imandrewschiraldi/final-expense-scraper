import { LEAD_STATUS_COLORS, LEAD_STATUS_LABELS, LeadStatus } from "@/lib/leadStatus";
import { cn } from "@/lib/cn";

export function StatusBadge({ status }: { status: LeadStatus }) {
  const colors = LEAD_STATUS_COLORS[status];
  return (
    <span
      className={cn(
        "font-condensed inline-flex items-center rounded px-2 py-[3px] text-[11px] font-extrabold tracking-[0.08em] uppercase",
        colors.bg,
        colors.text,
      )}
    >
      {LEAD_STATUS_LABELS[status]}
    </span>
  );
}
