"use client";

import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import type { FilterCondition, FilterGroup } from "./types";

const FIELD_OPTIONS: { value: FilterCondition["field"]; label: string; operators: { value: string; label: string }[] }[] = [
  {
    value: "firstName",
    label: "First Name",
    operators: [{ value: "contains", label: "contains" }, { value: "equals", label: "equals" }],
  },
  {
    value: "lastName",
    label: "Last Name",
    operators: [{ value: "contains", label: "contains" }, { value: "equals", label: "equals" }],
  },
  { value: "phone", label: "Phone", operators: [{ value: "contains", label: "contains" }] },
  { value: "email", label: "Email", operators: [{ value: "contains", label: "contains" }] },
  { value: "source", label: "Source", operators: [{ value: "equals", label: "is" }] },
  { value: "state", label: "State", operators: [{ value: "equals", label: "is" }] },
  {
    value: "createdAt",
    label: "Created Date",
    operators: [{ value: "after", label: "is after" }, { value: "before", label: "is before" }],
  },
  {
    value: "updatedAt",
    label: "Last Activity Date",
    operators: [{ value: "after", label: "is after" }, { value: "before", label: "is before" }],
  },
  {
    value: "tags",
    label: "Tags",
    operators: [
      { value: "includesAny", label: "includes any" },
      { value: "includesAll", label: "includes all" },
      { value: "excludes", label: "excludes" },
    ],
  },
  { value: "hasOpenTask", label: "Has Open Task", operators: [{ value: "isTrue", label: "is true" }, { value: "isFalse", label: "is false" }] },
];

function newCondition(): FilterCondition {
  return { id: crypto.randomUUID(), field: "firstName", operator: "contains", value: "" };
}

export function FiltersDrawer({
  initial,
  onClose,
  onApply,
}: {
  initial: FilterGroup;
  onClose: () => void;
  onApply: (group: FilterGroup) => void;
}) {
  const [logic, setLogic] = useState<"AND" | "OR">(initial.logic);
  const [conditions, setConditions] = useState<FilterCondition[]>(
    initial.conditions.length > 0 ? initial.conditions : [],
  );

  function updateCondition(id: string, patch: Partial<FilterCondition>) {
    setConditions((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function removeCondition(id: string) {
    setConditions((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col border-l border-border bg-surface shadow-[0_0_60px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-condensed text-lg font-extrabold tracking-wide text-white uppercase">More Filters</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface2 hover:text-white"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-6">
          {conditions.length > 1 && (
            <div className="flex items-center gap-2 text-sm text-muted">
              Match
              <Select value={logic} onChange={(e) => setLogic(e.target.value as "AND" | "OR")} className="w-24">
                <option value="AND">ALL</option>
                <option value="OR">ANY</option>
              </Select>
              of the following:
            </div>
          )}

          {conditions.map((condition) => {
            const fieldDef = FIELD_OPTIONS.find((f) => f.value === condition.field)!;
            return (
              <div key={condition.id} className="space-y-2 rounded-lg border border-border bg-surface2 p-3">
                <div className="flex items-center gap-2">
                  <Select
                    value={condition.field}
                    onChange={(e) => {
                      const field = e.target.value as FilterCondition["field"];
                      const def = FIELD_OPTIONS.find((f) => f.value === field)!;
                      updateCondition(condition.id, { field, operator: def.operators[0].value, value: "" });
                    }}
                    className="flex-1"
                  >
                    {FIELD_OPTIONS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </Select>
                  <button
                    type="button"
                    onClick={() => removeCondition(condition.id)}
                    className="shrink-0 text-muted hover:text-red-light"
                    aria-label="Remove condition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <Select
                  value={condition.operator}
                  onChange={(e) => updateCondition(condition.id, { operator: e.target.value })}
                >
                  {fieldDef.operators.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </Select>
                {condition.field !== "hasOpenTask" && (
                  <Input
                    type={condition.field === "createdAt" || condition.field === "updatedAt" ? "date" : "text"}
                    value={condition.value}
                    onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                    placeholder="Value"
                  />
                )}
              </div>
            );
          })}

          <Button variant="secondary" onClick={() => setConditions((prev) => [...prev, newCondition()])} className="text-xs">
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add Condition
          </Button>
        </div>

        <div className={cn("flex items-center justify-between gap-2 border-t border-border p-4")}>
          <button
            type="button"
            onClick={() => {
              setConditions([]);
              onApply({ logic: "AND", conditions: [] });
            }}
            className="font-condensed text-[11px] font-bold tracking-[0.1em] text-muted uppercase hover:text-foreground"
          >
            Clear All
          </button>
          <Button onClick={() => onApply({ logic, conditions })}>Apply Filters</Button>
        </div>
      </div>
    </div>
  );
}
