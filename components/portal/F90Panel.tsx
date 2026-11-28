"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Lock, GraduationCap, Vault, Check, Upload, FileCheck, Power } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  F90_PHASES,
  F90_TOTAL_STEPS,
  F90_DAYS,
  F90_GRADUATION_AP,
  F90_TRUNK_NODES,
  f90DayNumber,
  f90IsGraduated,
  f90IsEligibleForCertificate,
  f90CurrentTrunkIndex,
  f90TrunkNodePosition,
  f90BranchNodePosition,
  isF90StepKey,
  type F90Step,
  type F90TrunkNode,
  type F90Link,
  type F90DocType,
} from "@/lib/f90Content";
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

const DAILY_NON_NEGOTIABLES = [
  { label: "Dials", value: "300" },
  { label: "Conversions", value: "30" },
  { label: "Appointments Booked", value: "3" },
  { label: "Close", value: "1" },
];

/** A static statement of the agency's Standard Operating Procedure (SOP)
 *  for daily production — not a live tracker. Agents log their actual
 *  numbers in the real KPI Tracker (linked above via step.links); this is
 *  just the fixed standard they're held to. */
function DailyNonNegotiables() {
  return (
    <div className="mt-4 rounded-xl border-2 p-4" style={{ borderColor: PAPER_BORDER, background: PAPER_BG }}>
      <p className="text-xs font-extrabold tracking-wide uppercase" style={{ color: ACCENT }}>
        Standard Operating Procedure
      </p>
      <p className="mt-1 mb-3 text-sm font-extrabold tracking-wide uppercase" style={{ color: INK }}>
        Hit any one of these every working day
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {DAILY_NON_NEGOTIABLES.map((b) => (
          <div key={b.label} className="rounded-lg border-2 p-3 text-center" style={{ borderColor: PAPER_BORDER }}>
            <p className="text-2xl font-extrabold" style={{ color: ACCENT }}>
              {b.value}
            </p>
            <p className="mt-1 text-[11px] font-bold uppercase" style={{ color: INK_MUTED }}>
              {b.label}
            </p>
          </div>
        ))}
      </div>
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
    <div className="mt-3 flex flex-col gap-2">
      {schedule.map((s) => (
        <div
          key={s.day}
          className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl border-2 p-3"
          style={{ borderColor: PAPER_BORDER, background: PAPER_BG }}
        >
          <div className="min-w-0">
            <p className="text-xs font-extrabold tracking-wide uppercase" style={{ color: INK }}>
              {s.day}
            </p>
            <p className="mt-0.5 text-xs font-bold" style={{ color: ACCENT }}>
              {label(s.startHour)}–{label(s.endHour)}
              {showZoneLabel ? "" : " ET"}
              <span className="font-semibold" style={{ color: INK_MUTED }}>
                {" "}
                · {s.topic}
              </span>
            </p>
          </div>
          <div className="shrink-0">
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

/** Resolves a selected roadmap key (a trunk node's own key, or one of its
 *  branch step keys) into what the Mission Drawer should actually show. */
function resolveSelection(key: string | null): DrawerSelection | null {
  if (!key) return null;
  const trunk = F90_TRUNK_NODES.find((t) => t.key === key);
  if (trunk) {
    if (trunk.kind === "phase") return { kind: "phase", trunk };
    if (trunk.kind === "vault") return { kind: "vault", trunk };
    return { kind: "graduation", trunk };
  }
  const step = findF90Step(key);
  if (!step) return null;
  const phase = F90_PHASES.find((p) => p.steps.some((s) => s.key === key));
  return { kind: "step", step, phaseKey: phase?.key ?? "" };
}

/** Where the map opens on first load — the first incomplete task within
 *  the agent's current phase, or that phase's/Vault's trunk node itself
 *  once there's nothing left to jump straight into. */
function initialSelectionKey(completedSteps: string[]): string | null {
  const trunkIndex = f90CurrentTrunkIndex(completedSteps);
  const trunk = F90_TRUNK_NODES[trunkIndex];
  if (!trunk) return null;
  if (trunk.kind === "phase") {
    const completedSet = new Set(completedSteps);
    const firstIncomplete = trunk.branches.find((b) => !completedSet.has(b.key));
    return firstIncomplete?.key ?? trunk.key;
  }
  return trunk.key;
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

type DrawerSelection =
  | { kind: "phase"; trunk: F90TrunkNode }
  | { kind: "vault"; trunk: F90TrunkNode }
  | { kind: "graduation"; trunk: F90TrunkNode }
  | { kind: "step"; step: F90Step; phaseKey: string };

function MissionDrawer({
  selection,
  completedSteps,
  savingKey,
  onToggle,
  onSelectNode,
  issuedAP,
  certificateEligible,
  agentTimeZone,
  docUrls,
  onDocUploaded,
}: {
  selection: DrawerSelection | null;
  completedSteps: Set<string>;
  savingKey: string | null;
  onToggle: (key: string, completed: boolean) => void;
  onSelectNode: (key: string) => void;
  issuedAP: number;
  certificateEligible: boolean;
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

  if (!selection) {
    return (
      <div className="f90-road-bg flex min-h-[260px] items-center justify-center rounded-2xl border border-white/10 p-8 text-center shadow-[0_0_30px_rgba(0,0,0,0.4)]">
        <p className="text-sm font-bold text-white/50">Tap a mission on the map to get started.</p>
      </div>
    );
  }

  if (selection.kind === "graduation") {
    const remaining = Math.max(0, F90_GRADUATION_AP - issuedAP);
    return (
      <div className="animate-f90-panel-in f90-road-bg rounded-2xl border border-white/10 p-6 shadow-[0_0_30px_rgba(0,0,0,0.4)]">
        <p className="font-condensed text-xs font-bold tracking-[0.2em] text-white/50 uppercase">Final Destination</p>
        <h3 className="font-condensed mb-3 text-xl font-extrabold text-white uppercase">Graduation</h3>
        <p className="mb-4 text-sm text-white/70">
          {certificateEligible
            ? "Every Phase 1–4 mission is complete and you've hit the Issued AP standard — your diploma is unlocked below."
            : `Complete every Phase 1–4 mission and reach $${F90_GRADUATION_AP.toLocaleString()} in Issued AP to unlock your diploma.`}
        </p>
        <div className="rounded-xl border border-white/15 bg-black/30 p-4">
          <p className="metal-copper-text text-sm font-bold">
            {`$${Math.round(issuedAP).toLocaleString()} / $${F90_GRADUATION_AP.toLocaleString()} Issued AP`}
          </p>
          {!certificateEligible && (
            <p className="mt-1 text-xs text-white/60">{`$${Math.round(remaining).toLocaleString()} to go.`}</p>
          )}
        </div>
        <p className="mt-4 text-xs font-bold tracking-wide text-white/50 uppercase">
          Scroll down to see your diploma ↓
        </p>
      </div>
    );
  }

  if (selection.kind === "vault") {
    const vaultPhase = F90_PHASES.find((p) => p.key === "P5");
    return (
      <div className="animate-f90-panel-in f90-road-bg rounded-2xl border border-white/10 p-6 shadow-[0_0_30px_rgba(0,0,0,0.4)]">
        <p className="font-condensed text-xs font-bold tracking-[0.2em] text-white/50 uppercase">Phase 5</p>
        <h3 className="font-condensed mb-4 text-xl font-extrabold text-white uppercase">Lead Scaling Vault</h3>
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
      </div>
    );
  }

  if (selection.kind === "phase") {
    const phase = F90_PHASES.find((p) => p.key === selection.trunk.key);
    return (
      <div className="animate-f90-panel-in f90-road-bg rounded-2xl border border-white/10 p-6 shadow-[0_0_30px_rgba(0,0,0,0.4)]">
        <p className="font-condensed text-xs font-bold tracking-[0.2em] text-white/50 uppercase">
          {phase?.subtitle}
        </p>
        <h3 className="font-condensed mb-4 text-xl font-extrabold text-white uppercase">{selection.trunk.title}</h3>
        <p className="mb-4 text-xs font-bold tracking-wide text-white/50 uppercase">Tap a task below</p>
        <div className="space-y-2">
          {selection.trunk.branches.map((b, i) => {
            const done = completedSteps.has(b.key);
            return (
              <button
                key={b.key}
                type="button"
                onClick={() => onSelectNode(b.key)}
                className="flex w-full items-center gap-3 rounded-xl border-2 border-white/15 bg-black/20 p-3 text-left transition-colors hover:border-white/30"
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-extrabold",
                    done
                      ? "border-transparent bg-[linear-gradient(135deg,var(--copper-metal-dk),var(--copper-metal-hi))] text-black"
                      : "border-white/30 text-white/70",
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className="text-sm font-bold text-white">{b.title}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const step = selection.step;
  const checked = completedSteps.has(step.key);
  const phaseTitle = F90_PHASES.find((p) => p.key === selection.phaseKey)?.title ?? "";

  return (
    <div
      key={step.key}
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

      {step.key === "P3_S1" && <DailyNonNegotiables />}
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
  certificateEligible,
  selectedNode,
  onSelectNode,
}: {
  completedSteps: Set<string>;
  certificateEligible: boolean;
  selectedNode: string | null;
  onSelectNode: (key: string) => void;
}) {
  const currentTrunkIndex = f90CurrentTrunkIndex([...completedSteps]);
  const lastTrunk = f90TrunkNodePosition(F90_TRUNK_NODES.length - 1);
  const totalHeight = lastTrunk.y + 110;

  return (
    <div
      className="f90-road-bg relative overflow-hidden rounded-2xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)]"
      style={{ height: totalHeight }}
    >
      <p className="font-condensed absolute top-4 left-1/2 z-10 -translate-x-1/2 text-center text-xs font-extrabold tracking-[0.3em] text-white/80 uppercase">
        Roadmap to Graduation
      </p>
      <svg viewBox={`0 0 100 ${totalHeight}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        {F90_TRUNK_NODES.slice(0, -1).map((trunk, i) => {
          const a = f90TrunkNodePosition(i);
          const b = f90TrunkNodePosition(i + 1);
          const traveled = i < currentTrunkIndex;
          return (
            <line
              key={trunk.key}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={traveled ? "var(--copper-metal-hi)" : "rgba(255,255,255,0.3)"}
              strokeWidth={traveled ? 1.2 : 0.7}
              strokeDasharray={traveled ? undefined : "2.5,2.5"}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
        {F90_TRUNK_NODES.map((trunk, i) => {
          if (trunk.branches.length === 0) return null;
          const trunkPos = f90TrunkNodePosition(i);
          const trunkReached = i <= currentTrunkIndex;
          return trunk.branches.map((branch, j) => {
            const pos = f90BranchNodePosition(i, j, trunk.branches.length);
            const done = completedSteps.has(branch.key);
            return (
              <line
                key={branch.key}
                x1={trunkPos.x}
                y1={trunkPos.y}
                x2={pos.x}
                y2={pos.y}
                stroke={done ? "var(--copper-metal-hi)" : "rgba(255,255,255,0.25)"}
                strokeWidth={done ? 0.9 : 0.5}
                strokeDasharray={done ? undefined : "2,2"}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                opacity={trunkReached ? 1 : 0.4}
              />
            );
          });
        })}
      </svg>

      {F90_TRUNK_NODES.map((trunk, i) => {
        const pos = f90TrunkNodePosition(i);
        const isVault = trunk.kind === "vault";
        const isGraduation = trunk.kind === "graduation";
        const completed = trunk.kind === "phase" && trunk.branches.every((b) => completedSteps.has(b.key));
        const locked = isGraduation ? !certificateEligible : i > currentTrunkIndex;
        const isCurrent = isGraduation ? certificateEligible : i === currentTrunkIndex;
        const isSelected = selectedNode === trunk.key;
        return (
          <button
            key={trunk.key}
            type="button"
            data-testid={`f90-trunk-${trunk.key}`}
            onClick={() => onSelectNode(trunk.key)}
            className="absolute z-10 flex flex-col items-center gap-1"
            style={{ left: `${pos.x}%`, top: pos.y, transform: "translate(-50%, -50%)" }}
          >
            <span
              className={cn(
                "flex h-16 w-16 items-center justify-center rounded-full border-4 font-condensed text-sm font-extrabold transition-transform hover:scale-105",
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
              style={isCurrent ? { boxShadow: "0 0 24px 3px var(--copper-metal-hi)" } : undefined}
            >
              {completed ? (
                <Check className="h-7 w-7" />
              ) : locked ? (
                <Lock className="h-6 w-6" />
              ) : isGraduation ? (
                <GraduationCap className="h-7 w-7" />
              ) : isVault ? (
                <Vault className="h-7 w-7" />
              ) : (
                i + 1
              )}
            </span>
            <span className="max-w-[104px] text-center text-[10px] font-bold tracking-wide text-white/80 uppercase">
              {trunk.title}
            </span>
          </button>
        );
      })}

      {F90_TRUNK_NODES.map((trunk, i) => {
        if (trunk.branches.length === 0) return null;
        const trunkLocked = i > currentTrunkIndex;
        return trunk.branches.map((branch, j) => {
          const pos = f90BranchNodePosition(i, j, trunk.branches.length);
          const completed = completedSteps.has(branch.key);
          const isSelected = selectedNode === branch.key;
          return (
            <button
              key={branch.key}
              type="button"
              data-testid={`f90-node-${branch.key}`}
              onClick={() => onSelectNode(branch.key)}
              className="absolute z-10 flex flex-col items-center gap-1"
              style={{ left: `${pos.x}%`, top: pos.y, transform: "translate(-50%, -50%)" }}
            >
              <span
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-[3px] font-condensed text-xs font-extrabold transition-transform hover:scale-105",
                  isSelected && "scale-110",
                  completed
                    ? "border-transparent bg-[linear-gradient(135deg,var(--copper-metal-dk),var(--copper-metal-hi))] text-black"
                    : trunkLocked
                      ? "border-white/15 bg-black/50 text-white/35 backdrop-blur-sm"
                      : "border-white/30 bg-black/40 text-white/70",
                )}
              >
                {completed ? <Check className="h-4 w-4" /> : trunkLocked ? <Lock className="h-3.5 w-3.5" /> : j + 1}
              </span>
              <span className="max-w-[76px] text-center text-[8px] font-bold tracking-wide text-white/60 uppercase">
                {branch.title}
              </span>
            </button>
          );
        });
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
  const [selectedNode, setSelectedNode] = useState<string | null>(() =>
    initialSelectionKey(initialCompletedSteps),
  );

  const enrolledDate = new Date(enrolledAt);
  const dayNumber = f90DayNumber(enrolledDate);
  const pastDay90 = f90IsGraduated(enrolledDate);
  const completedArray = useMemo(() => [...completedSteps], [completedSteps]);
  const completedStepCount = useMemo(
    () => completedArray.filter(isF90StepKey).length,
    [completedArray],
  );
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

  const selection = resolveSelection(selectedNode);

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

      <div className="sticky top-0 z-30 -mx-4 bg-background px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <F90Hud dayNumber={dayNumber} issuedAP={issuedAP} salesCount={salesCount} />
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="lg:w-[65%]">
          <RoadmapCanvas
            completedSteps={completedSteps}
            certificateEligible={certificateEligible}
            selectedNode={selectedNode}
            onSelectNode={setSelectedNode}
          />
          <div className="mt-6">
            <F90Diploma agentName={agentName} issuedAP={issuedAP} eligible={certificateEligible} />
          </div>
        </div>

        <div className="lg:sticky lg:top-[244px] lg:max-h-[calc(100vh-268px)] lg:w-[35%] lg:self-start lg:overflow-y-auto lg:pr-1">
          <MissionDrawer
            selection={selection}
            completedSteps={completedSteps}
            savingKey={savingKey}
            onToggle={toggleStep}
            onSelectNode={setSelectedNode}
            issuedAP={issuedAP}
            certificateEligible={certificateEligible}
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
