"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Lock, GraduationCap, Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Stepper } from "@/components/ui/Stepper";
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
import { zonedWallTimeToInstant } from "@/lib/timeZoneMath";

// The step-detail "worksheet" is deliberately a literal printed-document
// surface — white page, black rules, a copper frame and color-blocked
// section bars, modeled directly on the agency's own New Agent Playbook
// one-pager (black number badges, copper section bars, black-bordered
// boxes, sharp corners) — a hard break from the rest of the app's dark
// theme on purpose. The roadmap above it stays dark/game-like for
// navigation; this is the actual fill-in content. Plain hex values (not
// the app's dark-mode CSS vars) since they need to hold on a white
// background regardless of the app's own theme.
const INK = "#141414";
const INK_MUTED = "#2b2b2b";
const PAPER_BORDER = "#141414";
const PAPER_BG = "#ffffff";
const ACCENT = "#b5551e";
const CREAM = "#f5efe3";

// Winding-path positions (percent of the road container) for each stop —
// deliberately not a straight evenly-spaced row, so this actually reads as
// a road climbing toward graduation rather than a plain progress stepper.
const ROAD_POSITIONS: Record<string, { x: number; y: number }> = {
  P1: { x: 8, y: 82 },
  P2: { x: 26, y: 40 },
  P3: { x: 44, y: 76 },
  P4: { x: 62, y: 34 },
  P5: { x: 80, y: 72 },
  GRAD: { x: 94, y: 22 },
};

function WorksheetLinkPill({ link }: { link: F90Link }) {
  const className =
    "border-2 px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide transition-colors";
  if (!link.href) {
    return (
      <span
        className={cn(className, "cursor-not-allowed border-dashed")}
        style={{ borderColor: "#999", color: "#999" }}
      >
        {link.label} (coming soon)
      </span>
    );
  }
  const style = { borderColor: INK, color: ACCENT, background: "#fff" };
  if (link.href.startsWith("/")) {
    return (
      <Link href={link.href} className={cn(className, "hover:bg-[#f5efe3]")} style={style}>
        {link.label}
      </Link>
    );
  }
  return (
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(className, "hover:bg-[#f5efe3]")}
      style={style}
    >
      {link.label}
    </a>
  );
}

const KPI_FIELDS = [
  { key: "dials" as const, label: "Outbound Dials", goal: 300, step: 5 },
  { key: "apptsShown" as const, label: "Appointments", goal: 3, step: 1 },
  { key: "dealsClosed" as const, label: "Closed Policies", goal: 1, step: 1 },
];

/** A genuinely live, editable mini KPI Tracker — the same per-agent daily
 *  KpiEntry the full tracker reads and writes (same +/- Stepper control,
 *  same endpoint), not a read-only summary of it. */
function MiniKpiTracker() {
  const today = useMemo(() => formatKpiDate(new Date()), []);
  const [entry, setEntry] = useState<{
    dials: number;
    apptsShown: number;
    dealsClosed: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/agent/kpi-tracker/entry?date=${today}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.entry) setEntry(data.entry);
      })
      .finally(() => setLoading(false));
  }, [today]);

  function updateField(field: "dials" | "apptsShown" | "dealsClosed", value: number) {
    setEntry((prev) => ({
      dials: prev?.dials ?? 0,
      apptsShown: prev?.apptsShown ?? 0,
      dealsClosed: prev?.dealsClosed ?? 0,
      ...prev,
      [field]: value,
    }));
    setError(null);
    fetch("/api/agent/kpi-tracker/entry", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: today, [field]: value }),
    }).catch(() => setError("Didn't save — try again."));
  }

  const values = {
    dials: entry?.dials ?? 0,
    apptsShown: entry?.apptsShown ?? 0,
    dealsClosed: entry?.dealsClosed ?? 0,
  };
  const hitGoal = KPI_FIELDS.some((f) => values[f.key] >= f.goal);

  return (
    <div className="mt-4 rounded-xl border-2 p-4" style={{ borderColor: PAPER_BORDER, background: PAPER_BG }}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-extrabold tracking-wide uppercase" style={{ color: INK }}>
          Win the day: 300 dials, 3 appointments, or 1 closed policy
        </p>
        {hitGoal && (
          <span className="rounded-full bg-[#1f7a3d] px-2.5 py-1 text-xs font-bold text-white">
            Goal hit today ✓
          </span>
        )}
      </div>
      {loading ? (
        <p className="text-sm" style={{ color: INK_MUTED }}>
          Loading today&apos;s numbers…
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {KPI_FIELDS.map((f) => (
            <div key={f.key}>
              <label className="mb-1.5 block text-xs font-bold uppercase" style={{ color: INK_MUTED }}>
                {f.label}
              </label>
              <Stepper
                value={values[f.key]}
                step={f.step}
                onChange={(v) => updateField(f.key, v)}
              />
            </div>
          ))}
        </div>
      )}
      {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
      <Link
        href="/agent/kpi-tracker"
        className="mt-3 inline-block text-xs font-bold underline"
        style={{ color: ACCENT }}
      >
        Open Full KPI Tracker →
      </Link>
    </div>
  );
}

type SuitabilityLead = {
  id: string;
  firstName: string;
  lastName: string;
  income?: string | null;
  existingCoverage?: string | null;
  coverageAmountRequested?: string | null;
  height?: string | null;
  weight?: string | null;
  tobaccoUse?: boolean | null;
  medicalNotes?: string | null;
};

const SUITABILITY_TEXT_FIELDS: {
  key: "income" | "existingCoverage" | "coverageAmountRequested" | "height" | "weight";
  label: string;
  placeholder: string;
}[] = [
  { key: "income", label: "Income / Budget", placeholder: "e.g. $4,500/mo" },
  { key: "existingCoverage", label: "Existing Coverage", placeholder: "e.g. $10,000 whole life" },
  { key: "coverageAmountRequested", label: "Coverage Requested", placeholder: "e.g. $25,000" },
  { key: "height", label: "Height", placeholder: "e.g. 5'10\"" },
  { key: "weight", label: "Weight", placeholder: "e.g. 210 lbs" },
];

const inputClassName =
  "w-full rounded-lg border-2 bg-white px-3 py-2 text-sm focus:outline-none";

/** The actual fillable fields for one lead — given a fresh `key={lead.id}`
 *  by its parent whenever the selected lead changes, so switching leads
 *  remounts this with brand-new initial state instead of needing an effect
 *  to re-sync local draft state to an incoming prop change. */
function SuitabilityForm({
  lead,
  onSaved,
}: {
  lead: SuitabilityLead;
  onSaved: (patch: Partial<SuitabilityLead>) => void;
}) {
  const [form, setForm] = useState({
    income: lead.income ?? "",
    existingCoverage: lead.existingCoverage ?? "",
    coverageAmountRequested: lead.coverageAmountRequested ?? "",
    height: lead.height ?? "",
    weight: lead.weight ?? "",
    medicalNotes: lead.medicalNotes ?? "",
  });
  const [tobaccoUse, setTobaccoUse] = useState(lead.tobaccoUse ?? false);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  async function saveField(field: string, value: string | boolean) {
    setSavingField(field);
    try {
      const res = await fetch(`/api/agent/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        setSavedAt(Date.now());
        onSaved({ [field]: value });
      }
    } finally {
      setSavingField(null);
    }
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        {savingField ? (
          <span className="text-xs" style={{ color: INK_MUTED }}>
            Saving…
          </span>
        ) : savedAt ? (
          <span className="text-xs font-bold text-[#1f7a3d]">Saved ✓</span>
        ) : null}
      </div>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          {SUITABILITY_TEXT_FIELDS.map((f) => (
            <div key={f.key}>
              <label className="mb-1 block text-xs font-bold uppercase" style={{ color: INK_MUTED }}>
                {f.label}
              </label>
              <input
                type="text"
                value={form[f.key]}
                placeholder={f.placeholder}
                onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                onBlur={(e) => {
                  if (e.target.value !== (lead[f.key] ?? "")) saveField(f.key, e.target.value);
                }}
                className={inputClassName}
                style={{ borderColor: PAPER_BORDER, color: INK }}
              />
            </div>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm font-bold" style={{ color: INK }}>
          <input
            type="checkbox"
            checked={tobaccoUse}
            onChange={(e) => {
              setTobaccoUse(e.target.checked);
              saveField("tobaccoUse", e.target.checked);
            }}
            className="h-4 w-4"
          />
          Tobacco Use
        </label>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase" style={{ color: INK_MUTED }}>
            Health History & Medications
          </label>
          <textarea
            value={form.medicalNotes}
            onChange={(e) => setForm((prev) => ({ ...prev, medicalNotes: e.target.value }))}
            onBlur={(e) => {
              if (e.target.value !== (lead.medicalNotes ?? "")) saveField("medicalNotes", e.target.value);
            }}
            rows={3}
            className={inputClassName}
            style={{ borderColor: PAPER_BORDER, color: INK }}
          />
        </div>
      </div>
    </div>
  );
}

/** A genuinely functional Client Suitability Sheet, not just a link out to
 *  it — the agent picks one of their own active leads and fills it out
 *  right here, saving through the exact same PATCH /api/agent/leads/[id]
 *  route LeadDetailPanel's own copy of this sheet uses. */
function SuitabilitySheetWidget() {
  const [leads, setLeads] = useState<SuitabilityLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    fetch("/api/agent/leads?archived=false")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.leads) setLeads(data.leads);
      })
      .finally(() => setLoading(false));
  }, []);

  const selectedLead = leads.find((l) => l.id === selectedId) ?? null;

  return (
    <div className="mt-4 rounded-xl border-2 p-4" style={{ borderColor: PAPER_BORDER, background: PAPER_BG }}>
      <p className="mb-3 text-sm font-extrabold tracking-wide uppercase" style={{ color: INK }}>
        Client Suitability Sheet
      </p>

      {loading ? (
        <p className="text-sm" style={{ color: INK_MUTED }}>
          Loading your leads…
        </p>
      ) : leads.length === 0 ? (
        <p className="text-sm" style={{ color: INK_MUTED }}>
          No active leads yet — once you have one, pick it here to fill this out live on the call.
        </p>
      ) : (
        <>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className={cn(inputClassName, "mb-4 font-semibold")}
            style={{ borderColor: PAPER_BORDER, color: INK }}
          >
            <option value="">Select a lead to fill this out for…</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.firstName} {l.lastName}
              </option>
            ))}
          </select>

          {selectedLead && (
            <SuitabilityForm
              key={selectedLead.id}
              lead={selectedLead}
              onSaved={(patch) => {
                setLeads((prev) =>
                  prev.map((l) => (l.id === selectedLead.id ? { ...l, ...patch } : l)),
                );
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

function TrainingScheduleStrip({
  schedule,
  agentTimeZone,
}: {
  schedule: { day: string; topic: string; startHour: number; endHour: number; link: F90Link }[];
  agentTimeZone: string | null;
}) {
  // The Academy always runs on America/New_York wall-clock time — this
  // converts that fixed ET slot into whatever zone the viewer's own
  // profile is set to, so "12–2 PM ET" reads as their own local time
  // instead of everyone doing Eastern-time math in their head.
  const zone = agentTimeZone || "America/New_York";
  const showZoneLabel = zone !== "America/New_York";

  function label(hour: number) {
    const instant = zonedWallTimeToInstant(hour, 0, "America/New_York");
    return new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hour: "numeric",
      minute: instant.getUTCMinutes() === 0 ? undefined : "2-digit",
    }).format(instant);
  }

  return (
    <div className="mt-3 grid grid-cols-5 gap-2">
      {schedule.map((s) => (
        <div
          key={s.day}
          className="rounded-xl border-2 p-2 text-center"
          style={{ borderColor: PAPER_BORDER, background: PAPER_BG }}
        >
          <p className="text-xs font-extrabold tracking-wide uppercase" style={{ color: INK }}>
            {s.day.slice(0, 3)}
          </p>
          <p className="mt-1 text-xs font-bold" style={{ color: ACCENT }}>
            {label(s.startHour)}–{label(s.endHour)}
            {showZoneLabel ? "" : " ET"}
          </p>
          <p className="mt-1 text-xs font-semibold" style={{ color: INK_MUTED }}>
            {s.topic}
          </p>
          <div className="mt-2 flex justify-center">
            <WorksheetLinkPill link={s.link} />
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
  agentTimeZone,
}: {
  phase: F90Phase;
  completedSteps: Set<string>;
  savingKey: string | null;
  onToggle: (key: string, completed: boolean) => void;
  phase5Unlocked: boolean;
  salesCount: number;
  dayNumber: number;
  issuedAP: number;
  agentTimeZone: string | null;
}) {
  const isP5 = phase.key === "P5";
  const phaseNumber = F90_PHASES.findIndex((p) => p.key === phase.key) + 1;

  return (
    <div
      className="overflow-hidden rounded-2xl border shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
      style={{ borderColor: "#ddd", background: PAPER_BG }}
    >
      <div
        className="flex items-center justify-between border-b-2 px-6 py-3 sm:px-8"
        style={{ borderColor: INK }}
      >
        <span className="text-xs font-extrabold tracking-[0.2em] uppercase" style={{ color: ACCENT }}>
          F90 Playbook
        </span>
        <span className="text-xs font-extrabold tracking-[0.2em] uppercase" style={{ color: ACCENT }}>
          Phase {phaseNumber} · {String(phaseNumber).padStart(2, "0")}
        </span>
      </div>

      <div
        className="px-6 py-3 text-center sm:px-8"
        style={{ background: ACCENT }}
      >
        <span className="text-sm font-extrabold tracking-[0.25em] text-white uppercase">
          {phase.title}
        </span>
      </div>

      <div className="p-6 sm:p-8">
        <p className="mb-6 text-xs font-extrabold tracking-[0.15em] uppercase" style={{ color: INK_MUTED }}>
          {phase.subtitle}
        </p>

        {isP5 ? (
        phase5Unlocked ? (
          <div>
            <div className="mb-5 flex flex-wrap overflow-hidden rounded-xl border-2" style={{ borderColor: INK }}>
              <div className="flex-1 border-r-2 p-4" style={{ borderColor: INK, background: CREAM }}>
                <p className="text-xs font-extrabold tracking-[0.15em] uppercase" style={{ color: INK }}>
                  90-Day Graduation Standard
                </p>
                <p className="mt-1 text-sm" style={{ color: INK }}>
                  {`Combine the Agent Accelerator Lead Program with whichever channel(s) below you run, and hit $${F90_GRADUATION_AP.toLocaleString()} in Issued Annual Premium within your first 90 days.`}
                </p>
              </div>
              <div
                className="flex shrink-0 flex-col items-center justify-center p-4 text-center"
                style={{ background: INK, minWidth: 180 }}
              >
                <span className="text-lg font-extrabold text-white">
                  {`$${Math.round(issuedAP).toLocaleString()}`}
                </span>
                <span className="text-xs font-bold uppercase" style={{ color: ACCENT }}>
                  {`of $${F90_GRADUATION_AP.toLocaleString()} AP`}
                </span>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {phase.channels?.map((c, idx) => {
                const selected = completedSteps.has(c.key);
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => onToggle(c.key, !selected)}
                    disabled={savingKey === c.key}
                    className="rounded-xl border-2 p-4 text-left transition-colors"
                    style={{
                      borderColor: INK,
                      background: selected ? INK : PAPER_BG,
                    }}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        className="text-xl font-extrabold"
                        style={{ color: selected ? "#fff" : ACCENT }}
                      >
                        {idx + 1}
                      </span>
                      <p
                        className="flex-1 text-base font-extrabold"
                        style={{ color: selected ? "#fff" : INK }}
                      >
                        {c.title}
                      </p>
                      {selected && <Check className="h-5 w-5 shrink-0 text-white" />}
                    </div>
                    <p className="text-sm" style={{ color: selected ? "#ddd" : INK_MUTED }}>
                      {c.description}
                    </p>
                    <p
                      className="mt-2 text-xs font-bold uppercase"
                      style={{ color: selected ? "#ddd" : INK_MUTED }}
                    >
                      Benchmark: {c.benchmark}
                    </p>
                    <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                      <WorksheetLinkPill link={c.link} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-xl border-2 p-4" style={{ borderColor: PAPER_BORDER, background: PAPER_BG }}>
            <Lock className="mt-0.5 h-5 w-5 shrink-0" style={{ color: INK_MUTED }} />
            <p className="text-base" style={{ color: INK }}>
              Locked until you&apos;ve closed 5 sales or reached Day 90 — you&apos;re at{" "}
              {salesCount} {salesCount === 1 ? "sale" : "sales"} and Day {dayNumber}.
            </p>
          </div>
        )
      ) : (
        // Numbered worksheet lines flowing down one continuous page — a
        // thin rule between items, not a separate boxed/shadowed card per
        // step, since a real worksheet is one sheet, not a stack of cards.
        // The embedded modules below (mini KPI tracker, suitability sheet,
        // training strip, the 6-box call workflow) keep their own light
        // boxes on purpose — those are actual fillable fields/sections on
        // the sheet, not another layer of "step cards."
        <div>
          {phase.steps.map((step, i) => {
            const checked = completedSteps.has(step.key);
            return (
              <div
                key={step.key}
                className={cn("py-5", i > 0 && "border-t-2")}
                style={{ borderColor: PAPER_BORDER }}
              >
                <div className="flex items-start gap-4">
                  <button
                    type="button"
                    onClick={() => onToggle(step.key, !checked)}
                    disabled={savingKey === step.key}
                    aria-label={checked ? "Mark incomplete" : "Mark complete"}
                    className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base font-extrabold transition-colors"
                    style={{
                      background: checked ? "#1f7a3d" : INK,
                      color: checked ? "#fff" : ACCENT,
                    }}
                  >
                    {checked ? <Check className="h-5 w-5 text-white" /> : i + 1}
                  </button>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <p
                        className="text-lg font-extrabold"
                        style={{ color: INK, textDecoration: checked ? "line-through" : undefined }}
                      >
                        {step.title}
                      </p>
                      {checked && (
                        <span className="rounded-full bg-[#1f7a3d] px-2 py-0.5 text-[11px] font-bold text-white uppercase">
                          Completed
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-base whitespace-pre-line" style={{ color: INK_MUTED }}>
                      {step.description}
                    </p>
                  </div>
                </div>

                {step.links && (
                  <div className="mt-4 ml-10 flex flex-wrap gap-2">
                    {step.links.map((link) => (
                      <WorksheetLinkPill key={link.label} link={link} />
                    ))}
                  </div>
                )}

                {step.trainingSchedule && (
                  <div className="ml-10">
                    <TrainingScheduleStrip schedule={step.trainingSchedule} agentTimeZone={agentTimeZone} />
                  </div>
                )}

                {step.subSteps && (
                  <div className="mt-4 ml-10 grid gap-3 sm:grid-cols-2">
                    {step.subSteps.map((sub) => (
                      <div
                        key={sub.heading}
                        className="rounded-xl border-2 p-4"
                        style={{ borderColor: PAPER_BORDER, background: "#fff" }}
                      >
                        <p className="text-sm font-extrabold tracking-wide uppercase" style={{ color: ACCENT }}>
                          {sub.heading}
                        </p>
                        <p className="mt-1.5 text-sm" style={{ color: INK }}>
                          {sub.prompt}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {step.key === "P3_S1" && (
                  <div className="ml-10">
                    <MiniKpiTracker />
                  </div>
                )}
                {step.key === "P3_S2" && (
                  <div className="ml-10">
                    <SuitabilitySheetWidget />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}

export function F90Panel({
  agentName,
  agentTimeZone,
  enrolledAt,
  initialCompletedSteps,
  salesCount,
  issuedAP,
}: {
  agentName: string;
  agentTimeZone: string | null;
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

      <div
        className="f90-road-bg mb-8 rounded-2xl border border-white/10 p-6 shadow-[0_0_40px_rgba(0,0,0,0.5)]"
      >
        <div className="mb-5 flex items-center justify-between">
          <span className="font-condensed text-[11px] font-bold tracking-[0.2em] text-white/70 uppercase">
            {pastDay90 ? "Day 90+" : `Day ${dayNumber} of ${F90_DAYS}`}
          </span>
          <span className="metal-copper-text text-sm font-bold">
            {completedStepCount}/{F90_TOTAL_STEPS} steps · {pct}%
          </span>
        </div>
        <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-black/40">
          <div
            className="h-full rounded-full"
            style={{
              width: `${pct}%`,
              background: "linear-gradient(90deg, var(--copper-metal-dk), var(--copper-metal-hi))",
              boxShadow: "0 0 10px var(--copper-metal-hi)",
            }}
          />
        </div>

        <p className="font-condensed mb-4 text-center text-sm font-extrabold tracking-[0.25em] text-white/90 uppercase">
          Roadmap to Graduation
        </p>

        <div className="relative h-80 w-full sm:h-72">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
          >
            {roadItems.slice(0, -1).map((item, i) => {
              const a = ROAD_POSITIONS[item.key];
              const b = ROAD_POSITIONS[roadItems[i + 1].key];
              const traveled = item.index < currentPhaseIndex;
              return (
                <line
                  key={item.key}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={traveled ? "var(--copper-metal-hi)" : "rgba(255,255,255,0.3)"}
                  strokeWidth={traveled ? 1 : 0.6}
                  strokeDasharray={traveled ? undefined : "2.5,2.5"}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </svg>
          {roadItems.map((item) => {
            const isGrad = item.key === "GRAD";
            const isComplete = !isGrad && item.index < currentPhaseIndex;
            const isCurrent = !isGrad && item.index === currentPhaseIndex;
            const isSelected = selectedNode === item.key;
            const pos = ROAD_POSITIONS[item.key];
            return (
              <button
                key={item.key}
                type="button"
                data-testid={`f90-road-node-${item.key}`}
                onClick={() => setSelectedNode(item.key)}
                className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2"
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              >
                <span
                  className={cn(
                    "flex h-16 w-16 items-center justify-center rounded-full border-4 font-condensed text-lg font-extrabold transition-transform hover:scale-105",
                    isSelected && "scale-110",
                    isCurrent && "animate-pulse",
                    isGrad
                      ? "border-[var(--copper-metal-hi)] bg-black/40 text-[var(--copper-metal-hi)]"
                      : isComplete
                        ? "border-white/20 bg-[linear-gradient(135deg,var(--copper-metal-dk),var(--copper-metal-hi))] text-black"
                        : isCurrent
                          ? "border-[var(--copper-metal-hi)] bg-black/40 text-white"
                          : isSelected
                            ? "border-white/60 bg-black/40 text-white"
                            : "border-white/15 bg-black/30 text-white/50",
                  )}
                  style={
                    isCurrent
                      ? { boxShadow: "0 0 22px 2px var(--copper-metal-hi)" }
                      : isComplete
                        ? { boxShadow: "0 0 10px rgba(240,160,80,0.4)" }
                        : undefined
                  }
                >
                  {isGrad ? (
                    <GraduationCap className="h-7 w-7" />
                  ) : isComplete ? (
                    <Check className="h-7 w-7" />
                  ) : (
                    item.index + 1
                  )}
                </span>
                <span className="max-w-[100px] text-center text-[11px] font-bold tracking-wide text-white/80 uppercase">
                  {item.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div key={selectedNode} className="animate-f90-panel-in">
        {isGradSelected ? (
          <div
            className="rounded-2xl border p-6 shadow-[0_12px_40px_rgba(0,0,0,0.35)] sm:p-8"
            style={{ borderColor: "#ddd", background: PAPER_BG }}
          >
            <h2 className="mb-2 text-2xl font-extrabold" style={{ color: INK }}>
              Graduation
            </h2>
            <p className="text-base" style={{ color: INK_MUTED }}>
              {`Reach $${F90_GRADUATION_AP.toLocaleString()} in Issued Annual Premium with every Phase 1–4 step complete, and this page turns into your certificate. You're at $${Math.round(issuedAP).toLocaleString()} today.`}
            </p>
          </div>
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
            agentTimeZone={agentTimeZone}
          />
        ) : null}
      </div>
    </div>
  );
}
