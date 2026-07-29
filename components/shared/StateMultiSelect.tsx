"use client";

import { cn } from "@/lib/cn";
import { US_STATES } from "@/lib/usStates";

export function StateMultiSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (states: string[]) => void;
}) {
  function toggle(code: string) {
    onChange(value.includes(code) ? value.filter((c) => c !== code) : [...value, code]);
  }

  return (
    <div className="w-full rounded-lg border border-border bg-surface p-2">
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <span className="text-xs text-muted">
          {value.length === 0 ? "No states selected" : `${value.length} selected`}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            className="text-xs text-teal-light hover:underline"
            onClick={() => onChange(US_STATES.map((s) => s.code))}
          >
            Select all
          </button>
          <button type="button" className="text-xs text-muted hover:underline" onClick={() => onChange([])}>
            Clear
          </button>
        </div>
      </div>
      <div className="grid max-h-48 grid-cols-4 gap-1.5 overflow-y-auto p-1 sm:grid-cols-6">
        {US_STATES.map((s) => {
          const active = value.includes(s.code);
          return (
            <button
              type="button"
              key={s.code}
              title={s.name}
              onClick={() => toggle(s.code)}
              className={cn(
                "font-condensed rounded-md border-[1.5px] px-1 py-1.5 text-[12px] font-bold tracking-[0.03em] uppercase transition-colors",
                active
                  ? "border-copper bg-copper text-black"
                  : "border-copper-dim text-muted hover:border-copper hover:text-foreground",
              )}
            >
              {s.code}
            </button>
          );
        })}
      </div>
    </div>
  );
}
