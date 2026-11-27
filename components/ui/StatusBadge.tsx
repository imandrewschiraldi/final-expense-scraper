import { LEAD_STATUS_COLORS, LEAD_STATUS_LABELS, LeadStatus } from "@/lib/leadStatus";
import { cn } from "@/lib/cn";

// A systemKey stage's `status` is always kept in sync with it (see the
// stage-change PATCH route), so its existing color still applies — the
// label just prefers the stage's own (possibly admin-renamed) name. A
// custom, no-systemKey stage has no status equivalent at all, so it gets a
// flat neutral treatment instead of whatever `status` happened to be
// before the lead was dragged there — same "no per-stage color" choice
// already made for Book of Business's own custom stages.
const NEUTRAL_COLORS = {
  bg: "bg-muted/20",
  text: "text-muted",
} as const;

export function StatusBadge({
  status,
  pipelineStage,
}: {
  status: LeadStatus;
  pipelineStage?: { name: string; systemKey: string | null } | null;
}) {
  const colors = pipelineStage && !pipelineStage.systemKey ? NEUTRAL_COLORS : LEAD_STATUS_COLORS[status];
  const label = pipelineStage?.name ?? LEAD_STATUS_LABELS[status];
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
      {label}
    </span>
  );
}
