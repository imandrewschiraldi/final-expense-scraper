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
        // Metal-*-surface backgrounds (NEW, SOLD, NOT_INTERESTED) sweep
        // through a light highlight band — same drop-shadow KPI tile icons
        // already use on top of the identical gradient, so white text (and,
        // harmlessly, black) stays legible against the lighter stops instead
        // of washing out.
        (colors.bg === "metal-copper-surface" || colors.bg === "metal-red-surface") &&
          "drop-shadow-[0_1px_1px_rgba(0,0,0,0.55)]",
      )}
    >
      {LEAD_STATUS_LABELS[status]}
    </span>
  );
}
