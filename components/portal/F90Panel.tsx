"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import {
  F90_PHASES,
  F90_TOTAL_STEPS,
  F90_DAYS,
  f90DayNumber,
  f90IsGraduated,
  f90Phase5Unlocked,
} from "@/lib/f90Content";

export function F90Panel({
  enrolledAt,
  initialCompletedSteps,
  salesCount,
}: {
  enrolledAt: string;
  initialCompletedSteps: string[];
  salesCount: number;
}) {
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(
    new Set(initialCompletedSteps),
  );
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const enrolledDate = new Date(enrolledAt);
  const dayNumber = f90DayNumber(enrolledDate);
  const graduated = f90IsGraduated(enrolledDate);
  const pct = Math.round((completedSteps.size / F90_TOTAL_STEPS) * 100);
  const phase5Unlocked = f90Phase5Unlocked(salesCount, enrolledDate);

  async function toggleStep(stepKey: string, completed: boolean) {
    setSavingKey(stepKey);
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (completed) next.add(stepKey);
      else next.delete(stepKey);
      return next;
    });
    try {
      const res = await fetch("/api/portal/f90", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepKey, completed }),
      });
      if (!res.ok) {
        // Roll back on failure — the step didn't actually save.
        setCompletedSteps((prev) => {
          const next = new Set(prev);
          if (completed) next.delete(stepKey);
          else next.add(stepKey);
          return next;
        });
      }
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div>
      <h1 className="font-condensed mb-1.5 text-[28px] font-extrabold tracking-wide text-white uppercase">
        F90 — First 90 Days
      </h1>
      <p className="mb-6 max-w-2xl text-sm text-muted">
        Your step-by-step path from pre-licensing to full-time production.
        Check off each step as you complete it — your progress is saved
        automatically.
      </p>

      <Card className="mb-8">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-condensed text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
            {graduated ? "Graduated" : `Day ${dayNumber} of ${F90_DAYS}`}
          </span>
          <span className="metal-copper-text text-sm font-bold">
            {completedSteps.size}/{F90_TOTAL_STEPS} steps · {pct}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface2">
          <div
            className="h-full rounded-full"
            style={{
              width: `${pct}%`,
              background:
                "linear-gradient(90deg, var(--copper-metal-dk), var(--copper-metal-hi))",
            }}
          />
        </div>
      </Card>

      <div className="space-y-6">
        {F90_PHASES.map((phase) => (
          <Card key={phase.key}>
            <div className="mb-4">
              <h2 className="font-condensed text-lg font-extrabold tracking-wide text-white uppercase">
                {phase.title}
              </h2>
              <p className="font-condensed text-[11px] font-bold tracking-[0.1em] text-muted uppercase">
                {phase.subtitle}
              </p>
            </div>
            {phase.key === "P5" && !phase5Unlocked ? (
              <div className="flex items-start gap-3 rounded-[10px] border border-border bg-surface2/40 p-4">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                <p className="text-sm text-muted">
                  Locked until you&apos;ve closed 5 sales or reached Day 90 —
                  you&apos;re at {salesCount} {salesCount === 1 ? "sale" : "sales"}{" "}
                  and Day {dayNumber}.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {phase.steps.map((step) => {
                  const checked = completedSteps.has(step.key);
                  return (
                    <div
                      key={step.key}
                      className="rounded-[10px] border border-border bg-surface2/40 p-3 transition-colors hover:border-copper-dim-gradient"
                    >
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={savingKey === step.key}
                          onChange={(e) => toggleStep(step.key, e.target.checked)}
                          className="mt-0.5 h-4 w-4 shrink-0"
                        />
                        <div>
                          <p
                            className={
                              checked
                                ? "text-sm font-semibold text-muted line-through"
                                : "text-sm font-semibold text-white"
                            }
                          >
                            {step.title}
                          </p>
                          <p className="mt-0.5 whitespace-pre-line text-sm text-muted">
                            {step.description}
                          </p>
                        </div>
                      </label>
                      {step.links && (
                        <div className="mt-3 ml-7 flex flex-wrap gap-2">
                          {step.links.map((link) => (
                            <Link
                              key={link.href}
                              href={link.href}
                              className="metal-copper-text rounded-lg border border-border px-3 py-1.5 text-xs font-bold transition-colors hover:border-copper-dim-gradient"
                            >
                              {link.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
