"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Lock, GraduationCap, Check, Upload, FileCheck, Power } from "lucide-react";
import { Stepper } from "@/components/ui/Stepper";
import { cn } from "@/lib/cn";
import {
  F90_PHASES,
  F90_TOTAL_STEPS,
  F90_DAYS,
  F90_GRADUATION_AP,
  F90_ROADMAP_NODES,
  f90DayNumber,
  f90IsGraduated,
  f90Phase5Unlocked,
  f90IsEligibleForCertificate,
  f90CurrentNodeIndex,
  f90RoadmapNodePosition,
  isF90StepKey,
  type F90Step,
  type F90Link,
  type F90DocType,
} from "@/lib/f90Content";
import { formatKpiDate } from "@/lib/kpiTracker";
import { zonedWallTimeToInstant } from "@/lib/timeZoneMath";
import { F90Hud } from "@/components/portal/F90Hud";
import { F90Diploma } from "@/components/portal/F90Diploma";

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

export function Confetti() {
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

/** Finds a step's full content (title/description/links/etc.) by key —
 *  F90_ROADMAP_NODES only carries the key/title needed to place a node on
 *  the map; F90_PHASES stays the one source of truth for everything else
 *  about it. */
function findF90Step(key: string): F90Step | null {
  for (const phase of F90_PHASES) {
    const step = phase.steps.find((s) => s.key === key);
    if (step) return step;
  }
  return null;
}

type DocUrls = Record<F90DocType, string | null>;

function DocUploadDropzone({
  label,
  docType,
  url,
  onUploaded,
}: {
  label: string;
  docType: F90DocType;
  url: string | null;
  onUploaded: (docType: F90DocType, url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("docType", docType);
      const res = await fetch("/api/portal/f90/upload-doc", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Upload failed");
        return;
      }
      const data = await res.json();
      onUploaded(docType, data.url);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) void handleFile(file);
      }}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed p-3 text-center transition-colors",
        url
          ? "border-[#2fd06b] bg-[#2fd06b]/10"
          : "border-white/20 bg-black/20 hover:border-[var(--copper-metal-hi)]",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />
      {url ? (
        <FileCheck className="h-5 w-5 text-[#2fd06b]" />
      ) : (
        <Upload className="h-5 w-5 text-white/60" />
      )}
      <p className="text-[11px] font-extrabold text-white uppercase">{label}</p>
      <p className="text-[9px] text-white/50">
        {uploading ? "Uploading…" : url ? "Uploaded" : "Click or drop"}
      </p>
      {error && <p className="text-[9px] text-red-400">{error}</p>}
    </div>
  );
}

function DialerSeatToggle({
  checked,
  saving,
  onToggle,
}: {
  checked: boolean;
  saving: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!checked)}
      disabled={saving}
      className={cn(
        "flex w-full items-center justify-center gap-3 rounded-xl border-2 px-4 py-3 transition-colors",
        checked ? "border-[#2fd06b] bg-[#2fd06b]/15" : "border-white/20 bg-black/20 hover:border-[var(--copper-metal-hi)]",
      )}
    >
      <Power className={checked ? "h-5 w-5 text-[#2fd06b]" : "h-5 w-5 text-white/50"} />
      <span className="text-sm font-extrabold text-white uppercase">
        {checked ? "$250 Dialer Seat Activated" : "Confirm $250 Dialer Seat Activation"}
      </span>
    </button>
  );
}

function GenericCompleteButton({
  checked,
  saving,
  onClick,
}: {
  checked: boolean;
  saving: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving}
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-extrabold tracking-wide uppercase transition-colors",
        checked
          ? "border-[#2fd06b] bg-[#2fd06b]/15 text-[#2fd06b]"
          : "border-white/20 bg-black/20 text-white hover:border-[var(--copper-metal-hi)]",
      )}
    >
      {checked ? (
        <>
          <Check className="h-4 w-4" /> Mission Complete
        </>
      ) : (
        "Mark Mission Complete"
      )}
    </button>
  );
}

function MissionDrawer({
  node,
  completedSteps,
  savingKey,
  onToggle,
  phase5Unlocked,
  salesCount,
  dayNumber,
  issuedAP,
  agentTimeZone,
  docUrls,
  onDocUploaded,
}: {
  node: { key: string; phaseKey: string; kind: "step" | "vault" } | null;
  completedSteps: Set<string>;
  savingKey: string | null;
  onToggle: (key: string, completed: boolean) => void;
  phase5Unlocked: boolean;
  salesCount: number;
  dayNumber: number;
  issuedAP: number;
  agentTimeZone: string | null;
  docUrls: DocUrls;
  onDocUploaded: (docType: F90DocType, url: string) => void;
}) {
  const [justCompleted, setJustCompleted] = useState(false);

  function handleToggle(key: string, completed: boolean) {
    onToggle(key, completed);
    if (completed) {
      setJustCompleted(true);
      setTimeout(() => setJustCompleted(false), 2200);
    }
  }

  if (!node) {
    return (
      <div className="f90-road-bg flex min-h-[260px] items-center justify-center rounded-2xl border border-white/10 p-8 text-center shadow-[0_0_30px_rgba(0,0,0,0.4)]">
        <p className="text-sm font-bold text-white/50">Tap a mission on the map to get started.</p>
      </div>
    );
  }

  if (node.kind === "vault") {
    const vaultPhase = F90_PHASES.find((p) => p.key === "P5");
    return (
      <div
        key={node.key}
        className="animate-f90-panel-in f90-road-bg rounded-2xl border border-white/10 p-6 shadow-[0_0_30px_rgba(0,0,0,0.4)]"
      >
        <p className="font-condensed text-xs font-bold tracking-[0.2em] text-white/50 uppercase">Phase 5</p>
        <h3 className="font-condensed mb-4 text-xl font-extrabold text-white uppercase">Lead Scaling Vault</h3>
        {phase5Unlocked ? (
          <>
            <div className="mb-4 rounded-xl border border-white/15 bg-black/30 p-4">
              <p className="text-xs font-bold text-white/60 uppercase">90-Day Graduation Standard</p>
              <p className="mt-1 text-sm text-white/80">
                {`Combine the Agent Accelerator Lead Program with whichever channel(s) below you run, and hit $${F90_GRADUATION_AP.toLocaleString()} in Issued AP within your first 90 days.`}
              </p>
              <p className="metal-copper-text mt-2 text-sm font-bold">
                {`$${Math.round(issuedAP).toLocaleString()} / $${F90_GRADUATION_AP.toLocaleString()}`}
              </p>
            </div>
            <div className="space-y-3">
              {vaultPhase?.channels?.map((c) => {
                const selected = completedSteps.has(c.key);
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => handleToggle(c.key, !selected)}
                    className={cn(
                      "w-full rounded-xl border-2 p-3 text-left transition-colors",
                      selected
                        ? "border-[var(--copper-metal-hi)] bg-[var(--copper-metal-hi)]/10"
                        : "border-white/15 bg-black/20 hover:border-white/30",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-white">{c.title}</p>
                      {selected && <Check className="h-4 w-4 text-[var(--copper-metal-hi)]" />}
                    </div>
                    <p className="mt-1 text-xs text-white/60">{c.description}</p>
                    <p className="mt-1 text-[11px] font-semibold text-white/40">Benchmark: {c.benchmark}</p>
                    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                      <WorksheetLinkPill link={c.link} />
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex items-start gap-3 rounded-xl border border-white/15 bg-black/30 p-4">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-white/50" />
            <p className="text-sm text-white/70">
              Locked until you&apos;ve closed 5 sales or reached Day 90 — you&apos;re at {salesCount}{" "}
              {salesCount === 1 ? "sale" : "sales"} and Day {dayNumber}.
            </p>
          </div>
        )}
      </div>
    );
  }

  const step = findF90Step(node.key);
  if (!step) return null;
  const checked = completedSteps.has(step.key);
  const phaseTitle = F90_PHASES.find((p) => p.key === node.phaseKey)?.title ?? "";

  return (
    <div
      key={node.key}
      className="animate-f90-panel-in f90-road-bg rounded-2xl border border-white/10 p-6 shadow-[0_0_30px_rgba(0,0,0,0.4)]"
    >
      <p className="font-condensed text-xs font-bold tracking-[0.2em] text-white/50 uppercase">{phaseTitle}</p>
      <h3 className="font-condensed mb-3 text-xl font-extrabold text-white uppercase">{step.title}</h3>
      <p className="mb-4 text-sm whitespace-pre-line text-white/70">{step.description}</p>

      {step.key === "P2_S2" ? (
        <DialerSeatToggle
          checked={checked}
          saving={savingKey === step.key}
          onToggle={(next) => handleToggle(step.key, next)}
        />
      ) : (
        <GenericCompleteButton
          checked={checked}
          saving={savingKey === step.key}
          onClick={() => handleToggle(step.key, !checked)}
        />
      )}

      {step.key === "P1_S5" && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          <DocUploadDropzone label="License" docType="license" url={docUrls.license} onUploaded={onDocUploaded} />
          <DocUploadDropzone label="E&O Cert" docType="eo" url={docUrls.eo} onUploaded={onDocUploaded} />
          <DocUploadDropzone label="AML Cert" docType="aml" url={docUrls.aml} onUploaded={onDocUploaded} />
        </div>
      )}

      {step.links && (
        <div className="mt-4 flex flex-wrap gap-2">
          {step.links.map((link) => (
            <WorksheetLinkPill key={link.label} link={link} />
          ))}
        </div>
      )}

      {step.trainingSchedule && (
        <div className="mt-4">
          <TrainingScheduleStrip schedule={step.trainingSchedule} agentTimeZone={agentTimeZone} />
        </div>
      )}

      {step.subSteps && (
        <div className="mt-4 grid gap-3">
          {step.subSteps.map((sub) => (
            <div key={sub.heading} className="rounded-xl border-2 p-4" style={{ borderColor: PAPER_BORDER, background: "#fff" }}>
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
        <div className="mt-4">
          <MiniKpiTracker />
        </div>
      )}
      {step.key === "P3_S2" && (
        <div className="mt-4">
          <SuitabilitySheetWidget />
        </div>
      )}

      {justCompleted && (
        <div className="animate-f90-panel-in mt-4 rounded-lg border border-[#2fd06b]/40 bg-[#2fd06b]/10 p-3 text-center text-xs font-extrabold tracking-wide text-[#2fd06b] uppercase">
          ✓ Mission Complete — Next Node Unlocked
        </div>
      )}
    </div>
  );
}

function RoadmapCanvas({
  completedSteps,
  phase5Unlocked,
  selectedNode,
  onSelectNode,
}: {
  completedSteps: Set<string>;
  phase5Unlocked: boolean;
  selectedNode: string | null;
  onSelectNode: (key: string) => void;
}) {
  const currentIndex = f90CurrentNodeIndex([...completedSteps]);
  const lastPos = f90RoadmapNodePosition(F90_ROADMAP_NODES.length - 1);
  const totalHeight = lastPos.y + 110;

  return (
    <div
      className="f90-road-bg relative overflow-hidden rounded-2xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)]"
      style={{ height: totalHeight }}
    >
      <p className="font-condensed absolute top-4 left-1/2 z-10 -translate-x-1/2 text-center text-xs font-extrabold tracking-[0.3em] text-white/80 uppercase">
        Roadmap to Graduation
      </p>
      <svg viewBox={`0 0 100 ${totalHeight}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        {F90_ROADMAP_NODES.slice(0, -1).map((node, i) => {
          const a = f90RoadmapNodePosition(i);
          const b = f90RoadmapNodePosition(i + 1);
          const traveled = i < currentIndex;
          return (
            <line
              key={node.key}
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
      {F90_ROADMAP_NODES.map((node, i) => {
        const pos = f90RoadmapNodePosition(i);
        const isVault = node.kind === "vault";
        const completed = !isVault && completedSteps.has(node.key);
        const isCurrent = i === currentIndex && (!isVault || phase5Unlocked);
        const vaultLockedAtCurrent = isVault && i === currentIndex && !phase5Unlocked;
        const locked = i > currentIndex || vaultLockedAtCurrent;
        const isSelected = selectedNode === node.key;
        return (
          <button
            key={node.key}
            type="button"
            data-testid={`f90-node-${node.key}`}
            onClick={() => onSelectNode(node.key)}
            className="absolute z-10 flex flex-col items-center gap-1"
            style={{ left: `${pos.x}%`, top: pos.y, transform: "translate(-50%, -50%)" }}
          >
            <span
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-full border-4 font-condensed text-sm font-extrabold transition-transform hover:scale-105",
                isSelected && "scale-110",
                isCurrent && "animate-pulse",
                completed
                  ? "border-transparent bg-[linear-gradient(135deg,var(--copper-metal-dk),var(--copper-metal-hi))] text-black"
                  : isCurrent
                    ? "border-[var(--copper-metal-hi)] bg-black/40 text-white"
                    : locked
                      ? "border-white/15 bg-black/50 text-white/40 backdrop-blur-sm"
                      : "border-white/30 bg-black/40 text-white/70",
              )}
              style={isCurrent ? { boxShadow: "0 0 20px 2px var(--copper-metal-hi)" } : undefined}
            >
              {completed ? (
                <Check className="h-6 w-6" />
              ) : locked ? (
                <Lock className="h-5 w-5" />
              ) : isVault ? (
                <GraduationCap className="h-6 w-6" />
              ) : (
                i + 1
              )}
            </span>
            <span className="max-w-[88px] text-center text-[9px] font-bold tracking-wide text-white/70 uppercase">
              {node.title}
            </span>
          </button>
        );
      })}
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
  initialDocUrls,
}: {
  agentName: string;
  agentTimeZone: string | null;
  enrolledAt: string;
  initialCompletedSteps: string[];
  salesCount: number;
  issuedAP: number;
  initialDocUrls: DocUrls;
}) {
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(
    new Set(initialCompletedSteps),
  );
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [docUrls, setDocUrls] = useState<DocUrls>(initialDocUrls);
  const [selectedNode, setSelectedNode] = useState<string | null>(
    () => F90_ROADMAP_NODES[f90CurrentNodeIndex(initialCompletedSteps)]?.key ?? null,
  );

  const enrolledDate = new Date(enrolledAt);
  const dayNumber = f90DayNumber(enrolledDate);
  const pastDay90 = f90IsGraduated(enrolledDate);
  const completedArray = useMemo(() => [...completedSteps], [completedSteps]);
  const completedStepCount = useMemo(
    () => completedArray.filter(isF90StepKey).length,
    [completedArray],
  );
  const phase5Unlocked = f90Phase5Unlocked(salesCount, enrolledDate);
  const certificateEligible = f90IsEligibleForCertificate(completedArray, issuedAP);

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

  const selectedNodeMeta = F90_ROADMAP_NODES.find((n) => n.key === selectedNode) ?? null;

  return (
    <div className="space-y-6">
      <div className="mb-1">
        <h1 className="font-condensed mb-1.5 text-[28px] font-extrabold tracking-wide text-white uppercase">
          F90 — First 90 Days
        </h1>
        <p className="max-w-2xl text-sm text-muted">
          {pastDay90
            ? "You've passed Day 90 — finish strong."
            : `Day ${dayNumber} of ${F90_DAYS}. ${completedStepCount}/${F90_TOTAL_STEPS} missions complete.`}{" "}
          Tap any mission on the map to open it.
        </p>
      </div>

      <F90Hud
        dayNumber={dayNumber}
        issuedAP={issuedAP}
        salesCount={salesCount}
        phase5Unlocked={phase5Unlocked}
      />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="lg:w-[65%]">
          <RoadmapCanvas
            completedSteps={completedSteps}
            phase5Unlocked={phase5Unlocked}
            selectedNode={selectedNode}
            onSelectNode={setSelectedNode}
          />
          <div className="mt-6">
            <F90Diploma agentName={agentName} issuedAP={issuedAP} eligible={certificateEligible} />
          </div>
        </div>

        <div className="lg:sticky lg:top-24 lg:w-[35%] lg:self-start">
          <MissionDrawer
            node={selectedNodeMeta}
            completedSteps={completedSteps}
            savingKey={savingKey}
            onToggle={toggleStep}
            phase5Unlocked={phase5Unlocked}
            salesCount={salesCount}
            dayNumber={dayNumber}
            issuedAP={issuedAP}
            agentTimeZone={agentTimeZone}
            docUrls={docUrls}
            onDocUploaded={(docType, url) =>
              setDocUrls((prev) => ({ ...prev, [docType]: url }))
            }
          />
        </div>
      </div>
    </div>
  );
}
