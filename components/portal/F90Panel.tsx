"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
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
  isF90StepKey,
  type F90Step,
  type F90Link,
  type F90DocType,
} from "@/lib/f90Content";
import { zonedWallTimeToInstant } from "@/lib/timeZoneMath";
import { PageHeading } from "@/components/portal/PageHeading";
import { F90Diploma } from "@/components/portal/F90Diploma";

// The whole worksheet is deliberately a literal printed-document surface —
// white page, black rules, a copper section bar and black number badges —
// modeled directly on the agency's own New Agent Playbook one-pager. Plain
// hex values (not the app's dark-mode CSS vars) since this page is always
// white regardless of the app's own theme (see .overlay-card-surface-light
// in globals.css, scoped to this route).
const INK = "#141414";
const INK_MUTED = "#2b2b2b";
const PAPER_BORDER = "#141414";
const PAPER_BG = "#ffffff";
const ACCENT = "#b5551e";
const GREEN = "#1f7a3d";

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
    <div className="mt-3 rounded-xl border-2 p-4" style={{ borderColor: PAPER_BORDER, background: PAPER_BG }}>
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
  "w-full rounded-lg border-2 bg-[#ffffff] px-3 py-2 text-sm focus:outline-none";

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
          <span className="text-xs font-bold" style={{ color: GREEN }}>Saved ✓</span>
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
    <div className="mt-3 rounded-xl border-2 p-4" style={{ borderColor: PAPER_BORDER, background: PAPER_BG }}>
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
        url ? "bg-[rgba(31,122,61,0.08)]" : "hover:bg-[#f5efe3]",
      )}
      style={{ borderColor: url ? GREEN : PAPER_BORDER }}
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
        <FileCheck className="h-5 w-5" style={{ color: GREEN }} />
      ) : (
        <Upload className="h-5 w-5" style={{ color: INK_MUTED }} />
      )}
      <p className="text-[11px] font-extrabold uppercase" style={{ color: INK }}>
        {label}
      </p>
      <p className="text-[9px]" style={{ color: INK_MUTED }}>
        {uploading ? "Uploading…" : url ? "Uploaded" : "Click or drop"}
      </p>
      {error && <p className="text-[9px] text-red-600">{error}</p>}
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
        checked ? "bg-[rgba(31,122,61,0.08)]" : "hover:bg-[#f5efe3]",
      )}
      style={{ borderColor: checked ? GREEN : PAPER_BORDER }}
    >
      <Power className="h-5 w-5" style={{ color: checked ? GREEN : INK_MUTED }} />
      <span className="text-sm font-extrabold uppercase" style={{ color: checked ? GREEN : INK }}>
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
        checked ? "bg-[rgba(31,122,61,0.08)]" : "hover:bg-[#f5efe3]",
      )}
      style={{ borderColor: checked ? GREEN : PAPER_BORDER, color: checked ? GREEN : INK }}
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

function NumberBadge({ n, done }: { n: number | string; done?: boolean }) {
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-sm font-extrabold"
      style={{ background: done ? GREEN : INK, color: "#ffffff" }}
    >
      {done ? <Check className="h-4 w-4" /> : n}
    </span>
  );
}

function SectionBar({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-t-lg px-4 py-2.5 text-center text-sm font-extrabold tracking-[0.15em] uppercase"
      style={{ background: ACCENT, color: "#ffffff" }}
    >
      {children}
    </div>
  );
}

function StepRow({
  n,
  step,
  checked,
  saving,
  onToggle,
  agentTimeZone,
  docUrls,
  onDocUploaded,
}: {
  n: number;
  step: F90Step;
  checked: boolean;
  saving: boolean;
  onToggle: (key: string, completed: boolean) => void;
  agentTimeZone: string | null;
  docUrls: DocUrls;
  onDocUploaded: (docType: F90DocType, url: string) => void;
}) {
  return (
    <div className="flex gap-3 border-b pb-4 last:border-b-0 last:pb-0" style={{ borderColor: "#e5e5e5" }}>
      <NumberBadge n={n} done={checked} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold uppercase" style={{ color: INK }}>
          {step.title}
        </p>
        <p className="mt-1 text-sm whitespace-pre-line" style={{ color: INK_MUTED }}>
          {step.description}
        </p>

        <div className="mt-3 max-w-sm">
          {step.key === "P2_S2" ? (
            <DialerSeatToggle checked={checked} saving={saving} onToggle={(next) => onToggle(step.key, next)} />
          ) : (
            <GenericCompleteButton checked={checked} saving={saving} onClick={() => onToggle(step.key, !checked)} />
          )}
        </div>

        {step.key === "P1_S5" && (
          <div className="mt-3 grid max-w-md grid-cols-3 gap-2">
            <DocUploadDropzone label="License" docType="license" url={docUrls.license} onUploaded={onDocUploaded} />
            <DocUploadDropzone label="E&O Cert" docType="eo" url={docUrls.eo} onUploaded={onDocUploaded} />
            <DocUploadDropzone label="AML Cert" docType="aml" url={docUrls.aml} onUploaded={onDocUploaded} />
          </div>
        )}

        {step.links && (
          <div className="mt-3 flex flex-wrap gap-2">
            {step.links.map((link) => (
              <WorksheetLinkPill key={link.label} link={link} />
            ))}
          </div>
        )}

        {step.trainingSchedule && (
          <TrainingScheduleStrip schedule={step.trainingSchedule} agentTimeZone={agentTimeZone} />
        )}

        {step.subSteps && (
          <div className="mt-3 grid gap-3">
            {step.subSteps.map((sub) => (
              <div key={sub.heading} className="rounded-xl border-2 p-4" style={{ borderColor: PAPER_BORDER }}>
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
          <div className="mt-3">
            <SuitabilitySheetWidget />
          </div>
        )}
      </div>
    </div>
  );
}

function PhaseWorksheetSection({
  sectionRef,
  phase,
  completedSteps,
  savingKey,
  onToggle,
  agentTimeZone,
  docUrls,
  onDocUploaded,
  issuedAP,
}: {
  sectionRef: (el: HTMLDivElement | null) => void;
  phase: (typeof F90_PHASES)[number];
  completedSteps: Set<string>;
  savingKey: string | null;
  onToggle: (key: string, completed: boolean) => void;
  agentTimeZone: string | null;
  docUrls: DocUrls;
  onDocUploaded: (docType: F90DocType, url: string) => void;
  issuedAP: number;
}) {
  return (
    <section ref={sectionRef} className="scroll-mt-28">
      <SectionBar>
        {phase.subtitle} · {phase.title}
      </SectionBar>
      <div
        className="rounded-b-xl border-2 border-t-0 p-4 sm:p-6"
        style={{ borderColor: PAPER_BORDER, background: PAPER_BG }}
      >
        {phase.channels ? (
          <>
            <p className="mb-4 text-sm" style={{ color: INK_MUTED }}>
              {`Combine the Agent Accelerator Lead Program with whichever channel(s) below you run, and hit $${F90_GRADUATION_AP.toLocaleString()} in Issued Annual Premium within your first 90 days — you're at $${Math.round(issuedAP).toLocaleString()} so far.`}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {phase.channels.map((c, i) => {
                const selected = completedSteps.has(c.key);
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => onToggle(c.key, !selected)}
                    className="rounded-xl border-2 p-4 text-left transition-colors"
                    style={{
                      borderColor: selected ? GREEN : PAPER_BORDER,
                      background: selected ? "rgba(31,122,61,0.08)" : "#fff",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <NumberBadge n={i + 1} done={selected} />
                      <p className="text-sm font-extrabold uppercase" style={{ color: INK }}>
                        {c.title}
                      </p>
                    </div>
                    <p className="mt-2 text-sm" style={{ color: INK_MUTED }}>
                      {c.description}
                    </p>
                    <p className="mt-2 text-sm font-extrabold" style={{ color: ACCENT }}>
                      {c.benchmark}
                    </p>
                    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                      <WorksheetLinkPill link={c.link} />
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div className="space-y-4">
            {phase.steps.map((step, i) => (
              <StepRow
                key={step.key}
                n={i + 1}
                step={step}
                checked={completedSteps.has(step.key)}
                saving={savingKey === step.key}
                onToggle={onToggle}
                agentTimeZone={agentTimeZone}
                docUrls={docUrls}
                onDocUploaded={onDocUploaded}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function RoadmapStrip({
  completedSteps,
  certificateEligible,
  onJump,
}: {
  completedSteps: Set<string>;
  certificateEligible: boolean;
  onJump: (key: string) => void;
}) {
  const currentTrunkIndex = f90CurrentTrunkIndex([...completedSteps]);

  return (
    <div className="overflow-x-auto rounded-xl border-2 p-4 sm:p-6" style={{ borderColor: PAPER_BORDER, background: PAPER_BG }}>
      <div className="flex min-w-max items-center sm:min-w-0">
        {F90_TRUNK_NODES.map((trunk, i) => {
          const isVault = trunk.kind === "vault";
          const isGraduation = trunk.kind === "graduation";
          const completed = trunk.kind === "phase" && trunk.branches.every((b) => completedSteps.has(b.key));
          const locked = isGraduation ? !certificateEligible : i > currentTrunkIndex;
          const isCurrent = isGraduation ? certificateEligible : i === currentTrunkIndex;
          return (
            <Fragment key={trunk.key}>
              {i > 0 && (
                <div
                  className="mx-1 h-0.5 w-8 shrink-0 sm:flex-1"
                  style={{ background: i <= currentTrunkIndex ? ACCENT : "#d8d8d8" }}
                />
              )}
              <button
                type="button"
                data-testid={`f90-roadmap-${trunk.key}`}
                onClick={() => onJump(trunk.key)}
                className="flex shrink-0 flex-col items-center gap-1.5"
              >
                <span
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-full border-2 text-sm font-extrabold transition-transform hover:scale-105 sm:h-14 sm:w-14",
                    isCurrent && "animate-pulse",
                  )}
                  style={{
                    borderColor: completed ? GREEN : isCurrent ? ACCENT : locked ? "#d8d8d8" : PAPER_BORDER,
                    background: completed ? GREEN : isCurrent ? ACCENT : locked ? "#f2f2f2" : "#fff",
                    color: completed || isCurrent ? "#fff" : locked ? "#999" : INK,
                    boxShadow: isCurrent ? `0 0 0 4px rgba(181,85,30,0.18)` : undefined,
                  }}
                >
                  {completed ? (
                    <Check className="h-5 w-5" />
                  ) : locked ? (
                    <Lock className="h-4 w-4" />
                  ) : isGraduation ? (
                    <GraduationCap className="h-5 w-5" />
                  ) : isVault ? (
                    <Vault className="h-5 w-5" />
                  ) : (
                    i + 1
                  )}
                </span>
                <span
                  className="max-w-[86px] text-center text-[9px] font-bold tracking-wide uppercase"
                  style={{ color: INK_MUTED }}
                >
                  {trunk.title}
                </span>
              </button>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

function StatBlock({
  value,
  label,
  caption,
}: {
  value: string;
  label: string;
  caption?: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl p-4" style={{ background: ACCENT }}>
      <div className="flex items-center gap-4">
        <p className="font-condensed text-3xl font-extrabold" style={{ color: "#ffffff" }}>
          {value}
        </p>
        <p className="text-xs font-extrabold tracking-wide uppercase" style={{ color: "#ffffff" }}>
          {label}
        </p>
      </div>
      {caption && (
        <p className="text-[11px] leading-snug" style={{ color: "rgba(255,255,255,0.85)" }}>
          {caption}
        </p>
      )}
    </div>
  );
}

export function F90Panel({
  agentName,
  agentTimeZone,
  enrolledAt,
  initialCompletedSteps,
  issuedAP,
  initialDocUrls,
}: {
  agentName: string;
  agentTimeZone: string | null;
  enrolledAt: string;
  initialCompletedSteps: string[];
  issuedAP: number;
  initialDocUrls: DocUrls;
}) {
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(
    new Set(initialCompletedSteps),
  );
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [docUrls, setDocUrls] = useState<DocUrls>(initialDocUrls);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

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

  function jumpTo(key: string) {
    sectionRefs.current[key]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="space-y-6">
      <div className="mb-1">
        <PageHeading slug="first-90" alt="First 90" />
        <div className="mt-3 mb-3 flex justify-center">
          <Image
            src="/headings/standard-operating-procedures-light.png"
            alt="Standard Operating Procedures"
            width={1022}
            height={36}
            className="h-[17px] w-auto lg:h-[26px]"
            priority
          />
        </div>
        <p className="max-w-2xl text-sm text-muted">
          {pastDay90
            ? "You've passed Day 90 — finish strong."
            : `Day ${dayNumber} of ${F90_DAYS}. ${completedStepCount}/${F90_TOTAL_STEPS} missions complete.`}{" "}
          Tap any phase below to jump straight to it.
        </p>
      </div>

      <RoadmapStrip completedSteps={completedSteps} certificateEligible={certificateEligible} onJump={jumpTo} />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatBlock
          value={`${Math.max(0, F90_DAYS - dayNumber)}`}
          label="Days Left in F90 University"
        />
        <StatBlock
          value={`$${Math.round(issuedAP).toLocaleString()}`}
          label="Issued Annual Premium"
          caption={`During your first 90 days, for agents utilizing the Agent Accelerator Lead Program, your goal is to issue $${F90_GRADUATION_AP.toLocaleString()} of Annual Premium.`}
        />
      </div>

      {F90_PHASES.map((phase) => (
        <PhaseWorksheetSection
          key={phase.key}
          sectionRef={(el) => {
            sectionRefs.current[phase.key] = el;
          }}
          phase={phase}
          completedSteps={completedSteps}
          savingKey={savingKey}
          onToggle={toggleStep}
          agentTimeZone={agentTimeZone}
          docUrls={docUrls}
          onDocUploaded={(docType, url) => setDocUrls((prev) => ({ ...prev, [docType]: url }))}
          issuedAP={issuedAP}
        />
      ))}

      <div
        ref={(el) => {
          sectionRefs.current.GRADUATION = el;
        }}
        className="scroll-mt-28"
      >
        <F90Diploma agentName={agentName} issuedAP={issuedAP} eligible={certificateEligible} />
      </div>
    </div>
  );
}
