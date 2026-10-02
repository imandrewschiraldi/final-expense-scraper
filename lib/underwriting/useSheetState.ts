import { useMemo, useState } from "react";
import { BandedResults, Condition, Product, SearchHit, SelectedCondition, Sheet } from "./types";
import { runUnderwriting } from "./engine";

/**
 * All client-entered state for one sheet (Whole Life or Term/UL/IUL), plus
 * the run/dirty workflow: results only (re)compute on `run()`, and `dirty`
 * flips true the moment an input changes after a run, so the UI can show
 * an "inputs changed" notice without silently recomputing underneath the
 * agent (see package README, product decision #2).
 *
 * `sheet` isn't read here — only used by the caller to pick the right
 * products/conditions to pass in — but is kept as a parameter so each
 * hook call is self-documenting about which sheet it's for.
 */
export function useSheetState(sheet: Sheet, products: Product[], conditions: Condition[]) {
  const [age, setAge] = useState("");
  // Not read by the engine yet — no rule or BMI calculation depends on it
  // (BMI itself is gender-neutral math). Collected now so it's on hand for
  // when build-chart checking is added, since real carrier build charts
  // (unlike flat BMI) are gender-specific.
  const [gender, setGender] = useState<"" | "M" | "F">("");
  const [ft, setFt] = useState(5);
  const [inch, setInch] = useState(6);
  const [wt, setWt] = useState("");
  const [tobacco, setTobacco] = useState(false);
  const [selected, setSelected] = useState<SelectedCondition[]>([]);
  const [results, setResults] = useState<BandedResults | null>(null);
  const [ranSnapshot, setRanSnapshot] = useState<string | null>(null);

  const conditionsById = useMemo(() => new Map(conditions.map((c) => [c.id, c])), [conditions]);

  const snapshot = JSON.stringify({ age, gender, ft, inch, wt, tobacco, selected });
  const hasRun = ranSnapshot !== null;
  const dirty = hasRun && ranSnapshot !== snapshot;

  function run() {
    setResults(runUnderwriting({ products, conditions, client: { age, tobacco }, selected }));
    setRanSnapshot(snapshot);
  }

  function addCondition(hit: SearchHit) {
    setSelected((prev) =>
      prev.some((s) => s.id === hit.id)
        ? prev
        : [...prev, { id: hit.id, yearsSince: "", current: true, via: hit.type === "medication" ? hit.name : null }],
    );
  }
  function removeCondition(idx: number) {
    setSelected((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateYears(idx: number, val: string) {
    setSelected((prev) => prev.map((s, i) => (i === idx ? { ...s, yearsSince: val } : s)));
  }
  function updateCurrent(idx: number, val: boolean) {
    setSelected((prev) => prev.map((s, i) => (i === idx ? { ...s, current: val } : s)));
  }

  return {
    age,
    setAge,
    gender,
    setGender,
    ft,
    setFt,
    inch,
    setInch,
    wt,
    setWt,
    tobacco,
    setTobacco,
    selected,
    addCondition,
    removeCondition,
    updateYears,
    updateCurrent,
    conditionsById,
    results,
    dirty,
    hasRun,
    run,
  };
}

export type SheetState = ReturnType<typeof useSheetState>;
