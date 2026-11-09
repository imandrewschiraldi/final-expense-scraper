"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

/** A +/- numeric input — the KPI Tracker's count fields (Dials, Hours
 *  worked, etc). No native number input anywhere in this flow: a stepper
 *  can't be left in a half-typed/invalid state the way a free-text field
 *  can, which matters for a value that autosaves on every change. */
export function Stepper({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}) {
  function clamp(n: number): number {
    let v = n;
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    return v;
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border border-copper-focus-gradient bg-surface px-2 py-1.5",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onChange(clamp(value - step))}
        disabled={min !== undefined && value <= min}
        aria-label="Decrease"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface2 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="font-condensed text-base font-bold text-white tabular-nums">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(clamp(value + step))}
        disabled={max !== undefined && value >= max}
        aria-label="Increase"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface2 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
