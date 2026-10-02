"use client";

import { useState } from "react";
import productsData from "@/data/underwriting/products.json";
import wlConditions from "@/data/underwriting/conditions-whole-life.json";
import tmConditions from "@/data/underwriting/conditions-term-ul-iul.json";
import medications from "@/data/underwriting/medications.json";
import { Condition, Medication, Product, Sheet } from "@/lib/underwriting/types";
import { bmi } from "@/lib/underwriting/engine";
import { useSheetState } from "@/lib/underwriting/useSheetState";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ConditionSearch } from "./ConditionSearch";
import { ResultsBands } from "./ResultsBands";
import { cn } from "@/lib/cn";

const products = productsData as { wholeLife: Product[]; termUlIul: Product[] };
const WL_CONDITIONS = wlConditions as Condition[];
const TM_CONDITIONS = tmConditions as Condition[];
const MEDICATIONS = medications as Medication;

const SHEETS: { key: Sheet; label: string }[] = [
  { key: "wl", label: "Final Expense / WL" },
  { key: "tm", label: "Term · UL · IUL" },
];

const FEET_OPTIONS = [4, 5, 6, 7];
const INCH_OPTIONS = Array.from({ length: 12 }, (_, i) => i);

/**
 * Field underwriting pre-qualification: enter a client's age, build, and
 * health history, and rank every carrier product by how likely it is to
 * approve them — underwriting only, never commission (see package
 * README's "Product decisions already made"). Results only (re)compute on
 * Run, matching the reference tool, so the agent reads a stable snapshot
 * rather than cards reshuffling as they type.
 *
 * Both sheets' state stays mounted simultaneously (two useSheetState
 * calls) so switching tabs never loses what was already entered on the
 * other one.
 */
export function UnderwritingGenie() {
  const [sheet, setSheet] = useState<Sheet>("wl");

  const wl = useSheetState("wl", products.wholeLife, WL_CONDITIONS);
  const tm = useSheetState("tm", products.termUlIul, TM_CONDITIONS);
  const active = sheet === "wl" ? wl : tm;
  const activeConditions = sheet === "wl" ? WL_CONDITIONS : TM_CONDITIONS;

  const bmiValue = bmi(active.ft, active.inch, parseFloat(active.wt) || 0);

  return (
    <div>
      <div className="mb-5 flex items-center gap-2">
        {SHEETS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSheet(s.key)}
            className={cn(
              "font-condensed rounded-lg border-[1.5px] px-4 py-2 text-[13px] font-bold tracking-[0.05em] uppercase transition-colors",
              sheet === s.key ? "toggle-pill-active" : "border-border text-muted hover:border-copper hover:text-foreground",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-surface p-5">
        <h2 className="font-condensed mb-4 text-base font-extrabold tracking-wide text-white uppercase">Client Intake</h2>

        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.1em] text-muted uppercase">Age</label>
            <Input type="number" inputMode="numeric" min={0} max={95} value={active.age} onChange={(e) => active.setAge(e.target.value)} />
          </div>
          <div>
            <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.1em] text-muted uppercase">Height</label>
            <div className="flex gap-1.5">
              <Select value={active.ft} onChange={(e) => active.setFt(Number(e.target.value))}>
                {FEET_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}&apos;
                  </option>
                ))}
              </Select>
              <Select value={active.inch} onChange={(e) => active.setInch(Number(e.target.value))}>
                {INCH_OPTIONS.map((i) => (
                  <option key={i} value={i}>
                    {i}&quot;
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.1em] text-muted uppercase">
              Weight (lbs)
            </label>
            <Input type="number" inputMode="numeric" value={active.wt} onChange={(e) => active.setWt(e.target.value)} />
          </div>
          <div className="flex items-end pb-1.5">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={active.tobacco}
                onChange={(e) => active.setTobacco(e.target.checked)}
                className="h-4 w-4 accent-copper"
              />
              <span className="font-condensed text-[13px] font-bold tracking-[0.05em] text-foreground uppercase">Tobacco</span>
            </label>
          </div>
        </div>

        {bmiValue != null && (
          <p className="font-condensed mb-4 text-sm tracking-[0.03em] text-teal-light">
            BMI {bmiValue} at {active.ft}&apos;{active.inch}&quot;, {active.wt} lbs — check each carrier&apos;s build chart link
            before quoting.
          </p>
        )}

        <ConditionSearch
          sheet={sheet}
          conditions={activeConditions}
          medications={MEDICATIONS}
          selected={active.selected}
          conditionsById={active.conditionsById}
          onAdd={active.addCondition}
          onRemove={active.removeCondition}
          onYearsChange={active.updateYears}
          onCurrentChange={active.updateCurrent}
        />
      </div>

      <div className="my-4 flex items-center justify-between gap-3">
        <Button onClick={active.run}>Run Underwriting</Button>
        {active.dirty && (
          <p className="font-condensed text-xs font-bold tracking-[0.05em] text-gold uppercase">
            Inputs changed — tap Run Underwriting to refresh.
          </p>
        )}
      </div>

      <ResultsBands results={active.results} hasSelections={active.selected.length > 0} />

      <p className="mt-8 text-xs text-muted">
        Internal use only — Tier 1 Financial. This tool summarizes carrier cheat-sheet guidance for field pre-qualification. It is
        not an underwriting decision. Always verify against the carrier&apos;s current underwriting guide before submitting an
        application.
      </p>
    </div>
  );
}
