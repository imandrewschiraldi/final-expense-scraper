"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Condition, Medication, SearchHit, SelectedCondition, Sheet } from "@/lib/underwriting/types";
import { search } from "@/lib/underwriting/engine";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

/** Search box for adding conditions/medications, plus the chip list of
 * what's already selected — each chip exposes the "years since" / "current"
 * inputs a condition's rules actually need (never both, never neither; see
 * useSheetState/engine.ts's evalRule for how those feed the verdict). */
export function ConditionSearch({
  sheet,
  conditions,
  medications,
  selected,
  conditionsById,
  onAdd,
  onRemove,
  onYearsChange,
  onCurrentChange,
}: {
  sheet: Sheet;
  conditions: Condition[];
  medications: Medication;
  selected: SelectedCondition[];
  conditionsById: Map<number, Condition>;
  onAdd: (hit: SearchHit) => void;
  onRemove: (idx: number) => void;
  onYearsChange: (idx: number, val: string) => void;
  onCurrentChange: (idx: number, val: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const hits = search(query, conditions, medications, sheet);

  function pick(hit: SearchHit) {
    onAdd(hit);
    setQuery("");
    setOpen(false);
  }

  return (
    <div>
      <div className="relative">
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && hits.length) {
              e.preventDefault();
              pick(hits[0]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder="Search health conditions or medications… (e.g. diabetes, metformin, COPD, eliquis)"
          autoComplete="off"
        />
        {open && query.trim().length >= 2 && (
          <div className="absolute top-full right-0 left-0 z-10 mt-1 max-h-72 overflow-y-auto rounded-lg border border-border bg-surface2 shadow-lg">
            {hits.length ? (
              hits.map((h) => (
                <button
                  key={`${h.type}-${h.id}-${h.name}`}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(h);
                  }}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-copper/[0.08]"
                >
                  <span>
                    {h.type === "medication" && <span className="text-teal-light">℞ </span>}
                    <span className="font-semibold">{h.name}</span>
                  </span>
                  {h.type === "medication" && <span className="text-xs text-muted">→ {h.mapsTo}</span>}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-muted italic">No match — check the carrier UW guide directly.</div>
            )}
          </div>
        )}
      </div>

      {selected.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {selected.map((sel, idx) => {
            const cond = conditionsById.get(sel.id);
            if (!cond) return null;
            const needsTime = Object.values(cond.rules).some((r) => r.k === "time");
            const needsCurrent = Object.values(cond.rules).some((r) => r.k === "current");
            return (
              <div
                key={`${sel.id}-${idx}`}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface2 px-3 py-2 text-sm"
              >
                <span className="font-semibold text-foreground">
                  {cond.name}
                  {sel.via && <span className="ml-1.5 text-xs text-teal-light">← {sel.via}</span>}
                </span>
                {needsTime && (
                  <label className="flex items-center gap-1.5 text-xs text-muted">
                    Yrs since dx/tx
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={0.5}
                      value={sel.yearsSince}
                      onChange={(e) => onYearsChange(idx, e.target.value)}
                      className="w-16 rounded border border-border bg-surface px-1.5 py-0.5 text-foreground focus:border-copper-dim focus:outline-none"
                    />
                  </label>
                )}
                {needsCurrent && (
                  <label className="flex items-center gap-1.5 text-xs text-muted">
                    <input
                      type="checkbox"
                      checked={sel.current !== false}
                      onChange={(e) => onCurrentChange(idx, e.target.checked)}
                      className="accent-copper"
                    />
                    Current / ongoing
                  </label>
                )}
                <button
                  type="button"
                  onClick={() => onRemove(idx)}
                  aria-label={`Remove ${cond.name}`}
                  className={cn("text-red-light/70 transition-colors hover:text-red-light")}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
