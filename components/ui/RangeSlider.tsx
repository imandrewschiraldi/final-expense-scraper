"use client";

import { cn } from "@/lib/cn";

/** A styled native range input — the KPI Tracker's Lead spend slider. The
 *  filled-vs-unfilled track is drawn with a plain linear-gradient sized to
 *  the current value rather than a second overlay element, since the
 *  native thumb already has to sit on top of whatever's here. */
export function RangeSlider({
  value,
  onChange,
  min,
  max,
  step = 1,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  className?: string;
}) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={cn(
        "h-1.5 w-full cursor-pointer appearance-none rounded-full outline-none",
        "[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-white",
        "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white",
        className,
      )}
      style={{
        background: `linear-gradient(to right, var(--copper-metal) ${pct}%, var(--border) ${pct}%)`,
      }}
    />
  );
}
