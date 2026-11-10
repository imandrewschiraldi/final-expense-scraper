"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

/** A +/- numeric input — the KPI Tracker's count fields (Dials, Hours
 *  worked, etc) — that also accepts typing a number directly into the
 *  middle of it. Same focused-local-text pattern as KpiTrackerPanel's
 *  DollarInput: only while focused does the field show its own in-progress
 *  text, so a half-typed value never gets clobbered by the value echoed
 *  back from the parent; unfocused, it always shows the live value. */
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
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);
  const displayText = focused ? text : String(value);

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
      <input
        type="text"
        inputMode="decimal"
        value={displayText}
        onFocus={() => {
          setFocused(true);
          setText(String(value));
        }}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9.]/g, "");
          setText(raw);
          const n = Number(raw);
          onChange(clamp(Number.isFinite(n) ? n : 0));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        onBlur={() => setFocused(false)}
        aria-label="Amount"
        className="font-condensed w-10 shrink-0 bg-transparent text-center text-base font-bold text-white tabular-nums focus:outline-none"
      />
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
