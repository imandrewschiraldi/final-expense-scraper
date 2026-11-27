"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Lock, GraduationCap, Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import {
  F90_PHASES,
  F90_TOTAL_STEPS,
  F90_DAYS,
  F90_GRADUATION_AP,
  f90DayNumber,
  f90IsGraduated,
  f90Phase5Unlocked,
  f90IsEligibleForCertificate,
  f90CurrentPhaseIndex,
  isF90StepKey,
  type F90Phase,
  type F90Link,
} from "@/lib/f90Content";
import { formatKpiDate } from "@/lib/kpiTracker";

function LinkPill({ link }: { link: F90Link }) {
  const className =
    "metal-copper-text rounded-lg border border-border px-3 py-1.5 text-xs font-bold transition-colors hover:border-copper-dim-gradient";
  if (!link.href) {
    return (
      <span className="cursor-not-allowed rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted opacity-60">
        {link.label} (coming soon)
      </span>
    );
  }
  if (link.href.startsWith("/")) {
    return (
      <Link href={link.href} className={className}>
        {link.label}
      </Link>
    );
  }
  return (
    <a href={link.href} target="_blank" rel="noopener noreferrer" className={className}>
      {link.label}
    </a>
  );
}

/** Today's actual dials/appointments/closes, fetched live — the same
 *  per-agent daily entry the full KPI Tracker reads and writes, so this
 *  always matches it rather than drifting as a separate counter. */
function DailyNonNegotiablesWidget() {
  const [entry, setEntry] = useState<{
    dials: number;
    apptsShown: number;
    dealsClosed: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = formatKpiDate(new Date());
    fetch(`/api/agent/kpi-tracker/entry?date=${today}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.entry) setEntry(data.entry);
      })
      .finally(() => setLoading(false));
  }, []);

  const rows = [
    { label: "Outbound Dials", value: entry?.dials ?? 0, goal: 300 },
    { label: "Appointments", value: entry?.apptsShown ?? 0, goal: 3 },
    { label: "Closed Policies", value: entry?.dealsClosed ?? 0, goal: 1 },
  ];
  const hitGoal = !loading && rows.some((r) => r.value >= r.goal);

  return (
    <div className="mt-3 rounded-[10px] border border-border bg-surface2/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-condensed text-[11px] font-bold tracking-[0.1em] text-muted uppercase">
          Today&apos;s Non-Negotiables
        </span>
        {hitGoal && (
          <span className="metal-copper-text text-xs font-bold">Goal hit today ✓</span>
        )}
      </div>
      {loading ? (
        <p className="text-sm text-muted">Loading today&apos;s numbers…</p>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {rows.map((r) => (
            <div key={r.label} className="text-center">
              <p className="font-condensed text-2xl font-extrabold text-white">
                {r.value}
                <span className="text-sm font-semibold text-muted">/{r.goal}</span>
              </p>
              <p className="text-[11px] text-muted">{r.label}</p>
            </div>
          ))}
        </div>
      )}
      <Link
        href="/agent/kpi-tracker"
        className="metal-copper-text mt-3 inline-block text-xs font-bold"
      >
        Open Full KPI Tracker →
      </Link>
    </div>
  );
}

function TrainingScheduleStrip({
  schedule,
}: {
  schedule: { day: string; topic: string; time: string; link: F90Link }[];
}) {
  return (
    <div className="mt-3 grid grid-cols-5 gap-2">
      {schedule.map((s) => (
        <div key={s.day} className="rounded-[10px] border border-border bg-surface2/40 p-2 text-center">
          <p className="font-condensed text-[11px] font-bold tracking-wide text-white uppercase">
            {s.day.slice(0, 3)}
          </p>
          <p className="mt-1 text-[11px] text-muted">{s.time}</p>
          <p className="mt-1 text-[11px] font-semibold text-white">{s.topic}</p>
          <div className="mt-2 flex justify-center">
            <LinkPill link={s.link} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Math.random() is impure and not allowed during render — this derives the
// same kind of scattered 0..1 jitter from a seed instead, deterministically
// (pure), which is all confetti placement actually needs.
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function confettiPieces() {
  return Array.from({ length: 80 }, (_, i) => ({
    id: i,
    left: pseudoRandom(i * 1.37) * 100,
    delay: pseudoRandom(i * 2.91) * 1.2,
    duration: 2.2 + pseudoRandom(i * 5.19) * 1.8,
    color: ["var(--copper-metal-hi)", "var(--copper-metal-dk)", "#f5c76b", "#ffffff"][i % 4],
    size: 6 + pseudoRandom(i * 7.63) * 6,
  }));
}

function Confetti() {
  const pieces = useMemo(() => confettiPieces(), []);
  // Purely decorative and never meaningful in the initial server-rendered
  // HTML — rendering only after mount avoids a hydration mismatch, since
  // the browser re-serializes the pieces' long floating-point inline
  // style values (position, size, animation timing) with different
  // rounding/precision than the server did, which React's hydration diff
  // otherwise flags even though nothing actually differs visually.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  if (!mounted) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute top-0 block rounded-sm"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.5,
            background: p.color,
            animation: `f90-confetti-fall ${p.duration}s ease-in ${p.delay}s 1 forwards`,
          }}
        />
      ))}
    </div>
  );
}

function F90GraduationView({
  agentName,
  issuedAP,
}: {
  agentName: string;
  issuedAP: number;
}) {
  const [showConfetti, setShowConfetti] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(false), 4500);
    return () => clearTimeout(t);
  }, []);

  async function downloadCertificate() {
    setDownloading(true);
    setError(null);
    try {
      const res = await fetch("/api/portal/f90/certificate");
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Couldn't generate the certificate.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "F90-Certificate.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="text-center">
      {showConfetti && <Confetti />}
      <GraduationCap className="metal-copper-text mx-auto mb-3 h-12 w-12" />
      <h1 className="font-condensed mb-1.5 text-[28px] font-extrabold tracking-wide text-white uppercase">
        You Graduated F90 University
      </h1>
      <p className="mx-auto mb-6 max-w-xl text-sm text-muted">
        {`${agentName}, you've issued $${Math.round(issuedAP).toLocaleString()} in Annual Premium and completed every Phase 1–4 step. Your certificate is ready below.`}
      </p>
      <Card className="mx-auto mb-4 max-w-4xl p-2">
        <iframe
          src="/api/portal/f90/certificate?inline=1"
          title="F90 Graduation Certificate"
          className="aspect-[792/612] w-full rounded-[6px]"
        />
      </Card>
      {error && <p className="mb-3 text-sm text-red-light">{error}</p>}
      <Button onClick={downloadCertificate} disabled={downloading}>
        {downloading ? "Generating…" : "Download Certificate"}
      </Button>
    </div>
  );
}

function PhaseDetail({
  phase,
  completedSteps,
  savingKey,
  onToggle,
  phase5Unlocked,
  salesCount,
  dayNumber,
  issuedAP,
}: {
  phase: F90Phase;
  completedSteps: Set<string>;
  savingKey: string | null;
  onToggle: (key: string, completed: boolean) => void;
  phase5Unlocked: boolean;
  salesCount: number;
  dayNumber: number;
  issuedAP: number;
}) {
  const isP5 = phase.key === "P5";

  return (
    <Card>
      <div className="mb-4">
        <h2 className="font-condensed text-lg font-extrabold tracking-wide text-white uppercase">
          {phase.title}
        </h2>
        <p className="font-condensed text-[11px] font-bold tracking-[0.1em] text-muted uppercase">
          {phase.subtitle}
        </p>
      </div>

      {isP5 ? (
        phase5Unlocked ? (
          <div>
            <div className="mb-4 rounded-[10px] border border-border bg-surface2/40 p-4">
              <p className="font-condensed text-[11px] font-bold tracking-[0.1em] text-muted uppercase">
                90-Day Graduation Standard
              </p>
              <p className="mt-1 text-sm text-muted">
                {`Combine the Agent Accelerator Lead Program with whichever channel(s) below you run, and hit $${F90_GRADUATION_AP.toLocaleString()} in Issued Annual Premium within your first 90 days.`}
              </p>
              <p className="metal-copper-text mt-2 text-sm font-bold">
                {`$${Math.round(issuedAP).toLocaleString()} / $${F90_GRADUATION_AP.toLocaleString()} Issued AP`}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {phase.channels?.map((c) => {
                const selected = completedSteps.has(c.key);
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => onToggle(c.key, !selected)}
                    disabled={savingKey === c.key}
                    className={cn(
                      "rounded-[10px] border-2 p-4 text-left transition-colors",
                      selected
                        ? "border-[var(--copper-metal-hi)] bg-surface2"
                        : "border-border bg-surface2/40 hover:border-copper-dim-gradient",
                    )}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-sm font-bold text-white">{c.title}</p>
                      {selected && <Check className="metal-copper-text h-4 w-4 shrink-0" />}
                    </div>
                    <p className="text-sm text-muted">{c.description}</p>
                    <p className="mt-2 text-xs font-semibold text-muted">
                      Benchmark: {c.benchmark}
                    </p>
                    <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                      <LinkPill link={c.link} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-[10px] border border-border bg-surface2/40 p-4">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
            <p className="text-sm text-muted">
              Locked until you&apos;ve closed 5 sales or reached Day 90 — you&apos;re at{" "}
              {salesCount} {salesCount === 1 ? "sale" : "sales"} and Day {dayNumber}.
            </p>
          </div>
        )
      ) : (
        <div className="space-y-3">
          {phase.steps.map((step) => {
            const checked = completedSteps.has(step.key);
            return (
              <div
                key={step.key}
                className="rounded-[10px] border border-border bg-surface2/40 p-4 transition-colors hover:border-copper-dim-gradient"
              >
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={savingKey === step.key}
                    onChange={(e) => onToggle(step.key, e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0"
                  />
                  <div className="flex-1">
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
                      <LinkPill key={link.label} link={link} />
                    ))}
                  </div>
                )}

                {step.trainingSchedule && (
                  <div className="ml-7">
                    <TrainingScheduleStrip schedule={step.trainingSchedule} />
                  </div>
                )}

                {step.subSteps && (
                  <div className="mt-4 ml-7 grid gap-3 sm:grid-cols-2">
                    {step.subSteps.map((sub) => (
                      <div
                        key={sub.heading}
                        className="rounded-[10px] border border-border bg-surface p-3"
                      >
                        <p className="font-condensed text-xs font-extrabold tracking-wide text-white uppercase">
                          {sub.heading}
                        </p>
                        <p className="mt-1 text-sm text-muted">{sub.prompt}</p>
                      </div>
                    ))}
                  </div>
                )}

                {step.key === "P3_S1" && (
                  <div className="ml-7">
                    <DailyNonNegotiablesWidget />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

export function F90Panel({
  agentName,
  enrolledAt,
  initialCompletedSteps,
  salesCount,
  issuedAP,
}: {
  agentName: string;
  enrolledAt: string;
  initialCompletedSteps: string[];
  salesCount: number;
  issuedAP: number;
}) {
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(
    new Set(initialCompletedSteps),
  );
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string>(
    () => F90_PHASES[f90CurrentPhaseIndex(initialCompletedSteps)].key,
  );

  const enrolledDate = new Date(enrolledAt);
  const dayNumber = f90DayNumber(enrolledDate);
  const pastDay90 = f90IsGraduated(enrolledDate);
  const completedArray = useMemo(() => [...completedSteps], [completedSteps]);
  // Phase 5's channel picks share the same completedSteps Set/API as the
  // real phase steps (reusing toggleStep), but they aren't steps and
  // shouldn't count toward "X/15 steps" — only F90_ALL_STEP_KEYS entries do.
  const completedStepCount = useMemo(
    () => completedArray.filter(isF90StepKey).length,
    [completedArray],
  );
  const pct = Math.round((completedStepCount / F90_TOTAL_STEPS) * 100);
  const phase5Unlocked = f90Phase5Unlocked(salesCount, enrolledDate);
  const certificateEligible = f90IsEligibleForCertificate(completedArray, issuedAP);
  const currentPhaseIndex = f90CurrentPhaseIndex(completedArray);

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

  if (certificateEligible) {
    return <F90GraduationView agentName={agentName} issuedAP={issuedAP} />;
  }

  const roadItems = [
    ...F90_PHASES.map((p, i) => ({ key: p.key, title: p.title, index: i })),
    { key: "GRAD", title: "Graduation", index: F90_PHASES.length },
  ];
  const selectedPhase = F90_PHASES.find((p) => p.key === selectedNode) ?? null;
  const isGradSelected = selectedNode === "GRAD";

  return (
    <div>
      <h1 className="font-condensed mb-1.5 text-[28px] font-extrabold tracking-wide text-white uppercase">
        F90 — First 90 Days
      </h1>
      <p className="mb-6 max-w-2xl text-sm text-muted">
        Your path from pre-licensing to full-time production. Click a stop on the road below to
        see what&apos;s next — your progress is saved automatically.
      </p>

      <Card className="mb-8">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-condensed text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
            {pastDay90 ? "Day 90+" : `Day ${dayNumber} of ${F90_DAYS}`}
          </span>
          <span className="metal-copper-text text-sm font-bold">
            {completedStepCount}/{F90_TOTAL_STEPS} steps · {pct}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface2">
          <div
            className="h-full rounded-full"
            style={{
              width: `${pct}%`,
              background: "linear-gradient(90deg, var(--copper-metal-dk), var(--copper-metal-hi))",
            }}
          />
        </div>
        <p className="mt-2 text-xs text-muted">
          {`Issued AP: $${Math.round(issuedAP).toLocaleString()} / $${F90_GRADUATION_AP.toLocaleString()} toward graduation`}
        </p>
      </Card>

      <div className="relative mb-6 overflow-x-auto pb-2">
        <div className="relative mx-auto flex min-w-[560px] max-w-3xl items-start justify-between px-2">
          <div className="absolute top-6 right-[8%] left-[8%] h-[3px] rounded-full bg-surface2" />
          <div
            className="absolute top-6 left-[8%] h-[3px] rounded-full"
            style={{
              width: `${(Math.min(currentPhaseIndex, F90_PHASES.length - 1) / (roadItems.length - 1)) * 84}%`,
              background: "linear-gradient(90deg, var(--copper-metal-dk), var(--copper-metal-hi))",
            }}
          />
          {roadItems.map((item) => {
            const isGrad = item.key === "GRAD";
            const isComplete = !isGrad && item.index < currentPhaseIndex;
            const isCurrent = !isGrad && item.index === currentPhaseIndex;
            const isSelected = selectedNode === item.key;
            return (
              <button
                key={item.key}
                type="button"
                data-testid={`f90-road-node-${item.key}`}
                onClick={() => setSelectedNode(item.key)}
                className="relative z-10 flex flex-col items-center gap-2"
                style={{ width: `${100 / roadItems.length}%` }}
              >
                <span
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-full border-2 font-condensed text-base font-extrabold transition-transform hover:scale-105",
                    isSelected && "scale-110",
                    isGrad
                      ? "border-[var(--copper-metal-hi)] bg-surface2 text-[var(--copper-metal-hi)]"
                      : isComplete
                        ? "border-transparent bg-[linear-gradient(135deg,var(--copper-metal-dk),var(--copper-metal-hi))] text-black"
                        : isCurrent
                          ? "border-[var(--copper-metal-hi)] bg-surface2 text-white"
                          : isSelected
                            ? "border-white/50 bg-surface2/60 text-white"
                            : "border-border bg-surface2/40 text-muted",
                  )}
                >
                  {isGrad ? (
                    <GraduationCap className="h-5 w-5" />
                  ) : isComplete ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    item.index + 1
                  )}
                </span>
                <span className="max-w-[92px] text-center text-[10px] font-bold tracking-wide text-muted uppercase">
                  {item.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div key={selectedNode} className="animate-f90-panel-in">
        {isGradSelected ? (
          <Card>
            <h2 className="font-condensed mb-1 text-lg font-extrabold tracking-wide text-white uppercase">
              Graduation
            </h2>
            <p className="text-sm text-muted">
              {`Reach $${F90_GRADUATION_AP.toLocaleString()} in Issued Annual Premium with every Phase 1–4 step complete, and this page turns into your certificate. You're at $${Math.round(issuedAP).toLocaleString()} today.`}
            </p>
          </Card>
        ) : selectedPhase ? (
          <PhaseDetail
            phase={selectedPhase}
            completedSteps={completedSteps}
            savingKey={savingKey}
            onToggle={toggleStep}
            phase5Unlocked={phase5Unlocked}
            salesCount={salesCount}
            dayNumber={dayNumber}
            issuedAP={issuedAP}
          />
        ) : null}
      </div>
    </div>
  );
}
