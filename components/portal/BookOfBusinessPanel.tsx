"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  LayoutGrid,
  List as ListIcon,
  Plus,
  Search,
  Settings2,
  StickyNote,
  Trash2,
} from "lucide-react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import { LEAD_TYPES, LEAD_TYPE_LABELS, type LeadType } from "@/lib/leadType";
import {
  FIELD_OPTIONS,
  loadFieldPrefs,
  saveFieldPrefs,
  type BookOfBusinessPhase,
} from "@/lib/bookOfBusinessFieldPrefs";
import { AddOpportunityForm } from "@/components/portal/AddOpportunityForm";
import { BookAppointmentForm } from "@/components/portal/BookAppointmentForm";
import {
  PolicySubmitForm,
  type SubmittedPolicy,
  type CarrierWithPlans,
} from "@/components/portal/PolicySubmitForm";
import { PolicyEditForm } from "@/components/portal/PolicyEditForm";
import { CarrierLogo } from "@/components/portal/CarrierLogo";

// Every Lead-phase opportunity carries this flat standard value — leads
// don't have a real dollar amount the way a submitted policy does, but a
// pipeline still needs one to total up per column, same as GoHighLevel's
// own boards always show a Value on every card regardless of stage.
const DEFAULT_LEAD_VALUE = 1200;

type Phase = "LEAD" | "CLIENT";
type ViewMode = "board" | "list";

type Stage = {
  id: string;
  phase: Phase;
  name: string;
  order: number;
  systemKey: string | null;
};

type OpportunityLead = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  state: string;
  status: string;
  pipelineStageId: string | null;
  assignedAgent: { name: string } | null;
  dateOfBirth: string | null;
  createdAt: string;
  leadType: LeadType;
  address: string | null;
  city: string | null;
  county: string | null;
  country: string | null;
  zip: string | null;
  age: number | null;
  employer: string | null;
  mortgageLender: string | null;
  mortgageAmount: string | null;
};

function leadAge(lead: OpportunityLead): string | null {
  if (lead.dateOfBirth) {
    const diffMs = Date.now() - new Date(lead.dateOfBirth).getTime();
    return String(Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000)));
  }
  return lead.age != null ? String(lead.age) : null;
}

// One value-getter per toggleable field in FIELD_OPTIONS.LEAD (see
// lib/bookOfBusinessFieldPrefs.ts) — shared by LeadCard's compact line and
// the list view's own columns below, so adding a field only ever means
// adding it in two places (there and here) instead of four.
const LEAD_FIELD_VALUES: Record<
  string,
  (lead: OpportunityLead) => string | null
> = {
  leadType: (lead) => LEAD_TYPE_LABELS[lead.leadType],
  phone: (lead) => lead.phone || null,
  dateOfBirth: (lead) =>
    lead.dateOfBirth ? new Date(lead.dateOfBirth).toLocaleDateString() : null,
  age: leadAge,
  address: (lead) => lead.address,
  city: (lead) => lead.city,
  state: (lead) => lead.state || null,
  zip: (lead) => lead.zip,
  county: (lead) => lead.county,
  country: (lead) => lead.country,
  employer: (lead) => lead.employer,
  mortgageLender: (lead) => lead.mortgageLender,
  mortgageAmount: (lead) => lead.mortgageAmount,
};

type OpportunityPolicy = SubmittedPolicy & {
  pipelineStageId: string | null;
  leadType: LeadType | null;
  notes?: string | null;
  followUpAt?: string | null;
};

function formatCurrency(value: string | number) {
  return Number(value).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function LeadCard({
  lead,
  fields,
  onOpen,
}: {
  lead: OpportunityLead;
  fields: string[];
  onOpen?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: lead.id });
  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 10,
      }
    : undefined;
  const name = `${lead.firstName} ${lead.lastName}`.trim();

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      className={cn(
        "cursor-grab touch-none rounded-lg border border-border bg-surface p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      <p className="truncate text-sm font-bold text-white">{name}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">
        {formatCurrency(DEFAULT_LEAD_VALUE)}
      </p>
      {(() => {
        const values = FIELD_OPTIONS.LEAD.filter((f) => fields.includes(f.key))
          .map((f) => LEAD_FIELD_VALUES[f.key]?.(lead))
          .filter((v): v is string => !!v);
        return (
          values.length > 0 && (
            <p className="mt-1.5 truncate text-xs text-muted">
              {values.join(" · ")}
            </p>
          )
        );
      })()}
    </div>
  );
}

function PolicyCard({
  policy,
  fields,
  onOpen,
}: {
  policy: OpportunityPolicy;
  fields: string[];
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: policy.id });
  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 10,
      }
    : undefined;
  const hasFollowUp = Boolean(policy.followUpAt);
  const hasNotes = Boolean(policy.notes?.trim());

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      className={cn(
        "cursor-grab touch-none rounded-lg border border-border bg-surface p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      <p className="truncate text-sm font-bold text-white">
        {policy.clientName}
      </p>
      <p className="mt-1 text-sm font-semibold text-foreground">
        {formatCurrency(policy.annualPremium)}
      </p>
      {(fields.includes("phone") ||
        fields.includes("state") ||
        fields.includes("carrier")) && (
        <p className="mt-1.5 truncate text-xs text-muted">
          {[
            fields.includes("carrier") && policy.carrier,
            fields.includes("state") && policy.state,
            fields.includes("phone") && policy.clientPhone,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
      {(hasNotes || hasFollowUp) && (
        <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-copper">
          {hasFollowUp ? (
            <CalendarClock className="h-3.5 w-3.5" />
          ) : (
            <StickyNote className="h-3.5 w-3.5" />
          )}
          {hasFollowUp
            ? new Date(policy.followUpAt!).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })
            : "Notes"}
        </p>
      )}
    </div>
  );
}

function BoardColumn({
  stage,
  count,
  totalValue,
  children,
}: {
  stage: Stage;
  count: number;
  totalValue: string | null;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col overflow-visible rounded-[10px] border border-border bg-surface2/40 transition-colors",
        isOver && "border-copper-dim-gradient bg-surface2",
      )}
    >
      <div className="border-b border-border/60 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-condensed truncate text-xs font-extrabold tracking-[0.08em] text-white uppercase">
            {stage.name}
          </h3>
          <span className="font-condensed shrink-0 rounded-full bg-surface2 px-2 py-0.5 text-[11px] font-bold text-muted">
            {count}
          </span>
        </div>
        {totalValue && (
          <p className="mt-0.5 text-[11px] font-semibold text-muted">
            {totalValue}
          </p>
        )}
      </div>
      <div className="flex min-h-[48px] flex-1 flex-col gap-2 p-2.5">
        {children}
      </div>
    </div>
  );
}

export function BookOfBusinessPanel({ isAgent }: { isAgent: boolean }) {
  const [phase, setPhase] = useState<Phase>("LEAD");
  const [leadType, setLeadType] = useState<LeadType>(LEAD_TYPES[0]);
  const [view, setView] = useState<ViewMode>("board");
  const [stages, setStages] = useState<Stage[]>([]);
  const [leads, setLeads] = useState<OpportunityLead[]>([]);
  const [policies, setPolicies] = useState<OpportunityPolicy[]>([]);
  const [counts, setCounts] = useState<
    Record<string, { LEAD: number; CLIENT: number }>
  >({});
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<OpportunityPolicy | null>(
    null,
  );
  const [showManageFields, setShowManageFields] = useState(false);
  const [fields, setFields] = useState<string[]>([]);
  const [carriers, setCarriers] = useState<CarrierWithPlans[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  // Set instead of ever patching a Lead straight to a "Sold" stage — see
  // isSoldStage below.
  const [soldLeadPrompt, setSoldLeadPrompt] = useState<OpportunityLead | null>(
    null,
  );
  // Set instead of ever patching a Lead straight to the Appointment Booked
  // stage — see isAppointmentStage above.
  const [appointmentPrompt, setAppointmentPrompt] = useState<{
    lead: OpportunityLead;
    targetStageId: string;
  } | null>(null);
  const [bookingAppointment, setBookingAppointment] = useState(false);
  const [appointmentError, setAppointmentError] = useState<string | null>(null);

  const router = useRouter();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor),
  );

  function loadCounts() {
    fetch("/api/portal/opportunities/counts")
      .then((res) => (res.ok ? res.json() : { counts: {} }))
      .then((data) => setCounts(data.counts ?? {}))
      .catch(() => setCounts({}));
  }

  function loadStages() {
    fetch(`/api/portal/pipeline-stages?phase=${phase}`)
      .then((res) => res.json())
      .then((data) => setStages(data.stages ?? []));
  }

  function loadOpportunities() {
    setLoading(true);
    fetch(`/api/portal/opportunities?phase=${phase}&leadType=${leadType}`)
      .then((res) => res.json())
      .then((data) => {
        if (phase === "LEAD") setLeads(data.leads ?? []);
        else setPolicies(data.policies ?? []);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    function init() {
      loadCounts();
      fetch("/api/portal/carrier-plans")
        .then((res) => (res.ok ? res.json() : { carriers: [] }))
        .then((data) => setCarriers(data.carriers ?? []))
        .catch(() => setCarriers([]));
    }
    init();
  }, []);

  useEffect(() => {
    function load() {
      loadStages();
      loadOpportunities();
      setFields(loadFieldPrefs(phase as BookOfBusinessPhase));
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, leadType]);

  const stagesById = useMemo(
    () => new Map(stages.map((s) => [s.id, s])),
    [stages],
  );
  // Moving a Lead onto a "Sold" stage — by drag or by the list dropdown —
  // doesn't patch the stage directly. It pops the Submit Policy form open
  // instead (prefilled from the lead), same as the user described: filling
  // out and submitting that form is what actually moves the opportunity
  // from the Lead pipeline to the matching Client pipeline (see
  // /api/portal/policies' leadId handling). Closing the form without
  // submitting leaves the lead exactly where it was.
  function isSoldStage(stageId: string) {
    return stagesById.get(stageId)?.systemKey === "SOLD";
  }
  // Moving a Lead onto "Appointment Booked" needs an actual date/time
  // before it can go on the agent's calendar, which a bare stage change
  // doesn't carry — see appointmentPrompt below.
  function isAppointmentStage(stageId: string) {
    return stagesById.get(stageId)?.systemKey === "APPOINTMENT_BOOKING";
  }
  // "Search Opportunities" just matches on contact/client name — opportunity
  // here means the same thing GoHighLevel means by it: a lead (unsold) or a
  // client (sold), so this one search box covers both phases.
  const query = search.trim().toLowerCase();
  const allItems: (OpportunityLead | OpportunityPolicy)[] =
    phase === "LEAD" ? leads : policies;
  const items = query
    ? allItems.filter((item) =>
        (phase === "LEAD"
          ? `${(item as OpportunityLead).firstName} ${(item as OpportunityLead).lastName}`
          : (item as OpportunityPolicy).clientName
        )
          .toLowerCase()
          .includes(query),
      )
    : allItems;
  const visibleLeads = phase === "LEAD" ? (items as OpportunityLead[]) : [];
  const visiblePolicies =
    phase === "CLIENT" ? (items as OpportunityPolicy[]) : [];
  // Which of the LEAD field toggles are on, in their canonical order — the
  // list view's own set of optional columns (see LEAD_FIELD_VALUES above).
  const leadListFields = FIELD_OPTIONS.LEAD.filter((f) =>
    fields.includes(f.key),
  );

  const columns = useMemo(() => {
    const grouped = new Map<string, (OpportunityLead | OpportunityPolicy)[]>();
    for (const stage of stages) grouped.set(stage.id, []);
    for (const item of items) {
      const stageId = item.pipelineStageId;
      if (stageId && grouped.has(stageId)) grouped.get(stageId)!.push(item);
    }
    return grouped;
  }, [stages, items]);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const targetStageId = String(over.id);
    const itemId = String(active.id);
    const current = items.find((i) => i.id === itemId);
    if (
      !current ||
      current.pipelineStageId === targetStageId ||
      !stagesById.has(targetStageId)
    )
      return;

    if (phase === "LEAD") {
      if (isSoldStage(targetStageId)) {
        setSoldLeadPrompt(current as OpportunityLead);
        return;
      }
      if (isAppointmentStage(targetStageId)) {
        setAppointmentPrompt({
          lead: current as OpportunityLead,
          targetStageId,
        });
        return;
      }
      setLeads((prev) =>
        prev.map((l) =>
          l.id === itemId ? { ...l, pipelineStageId: targetStageId } : l,
        ),
      );
      const res = await fetch(`/api/agent/leads/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipelineStageId: targetStageId }),
      });
      if (res.ok) {
        const data = await res.json();
        setLeads((prev) =>
          prev.map((l) => (l.id === itemId ? { ...l, ...data.lead } : l)),
        );
      } else {
        loadOpportunities();
      }
    } else {
      setPolicies((prev) =>
        prev.map((p) =>
          p.id === itemId ? { ...p, pipelineStageId: targetStageId } : p,
        ),
      );
      const res = await fetch(`/api/portal/policies/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipelineStageId: targetStageId }),
      });
      if (res.ok) {
        const data = await res.json();
        setPolicies((prev) =>
          prev.map((p) => (p.id === itemId ? { ...p, ...data.policy } : p)),
        );
      } else {
        loadOpportunities();
      }
      loadCounts();
    }
  }

  async function changeLeadStage(
    lead: OpportunityLead,
    pipelineStageId: string,
  ) {
    if (isSoldStage(pipelineStageId)) {
      setSoldLeadPrompt(lead);
      return;
    }
    if (isAppointmentStage(pipelineStageId)) {
      setAppointmentPrompt({ lead, targetStageId: pipelineStageId });
      return;
    }
    setUpdatingId(lead.id);
    const res = await fetch(`/api/agent/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipelineStageId }),
    });
    setUpdatingId(null);
    if (res.ok) {
      const data = await res.json();
      setLeads((prev) =>
        prev.map((l) => (l.id === lead.id ? { ...l, ...data.lead } : l)),
      );
    }
  }

  async function bookAppointment(startAt: string, endAt: string) {
    if (!appointmentPrompt) return;
    const { lead, targetStageId } = appointmentPrompt;
    setAppointmentError(null);
    setBookingAppointment(true);
    const stageRes = await fetch(`/api/agent/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipelineStageId: targetStageId }),
    });
    if (!stageRes.ok) {
      setBookingAppointment(false);
      const data = await stageRes.json().catch(() => null);
      setAppointmentError(data?.error ?? "Failed to update the lead's stage.");
      return;
    }
    const apptRes = await fetch(`/api/agent/leads/${lead.id}/appointment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startAt, endAt }),
    });
    setBookingAppointment(false);
    if (!apptRes.ok) {
      const data = await apptRes.json().catch(() => null);
      setAppointmentError(data?.error ?? "Failed to book the appointment.");
      return;
    }
    setAppointmentPrompt(null);
    loadOpportunities();
  }

  async function changePolicyStage(
    policy: OpportunityPolicy,
    pipelineStageId: string,
  ) {
    setUpdatingId(policy.id);
    const res = await fetch(`/api/portal/policies/${policy.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipelineStageId }),
    });
    setUpdatingId(null);
    if (res.ok) {
      const data = await res.json();
      setPolicies((prev) =>
        prev.map((p) => (p.id === policy.id ? { ...p, ...data.policy } : p)),
      );
      loadCounts();
    }
  }

  async function deletePolicy(policy: OpportunityPolicy) {
    if (
      !window.confirm(
        `Permanently delete the policy for ${policy.clientName}? This can't be undone.`,
      )
    )
      return;
    setDeletingId(policy.id);
    const res = await fetch(`/api/portal/policies/${policy.id}`, {
      method: "DELETE",
    });
    setDeletingId(null);
    if (res.ok) {
      setPolicies((prev) => prev.filter((p) => p.id !== policy.id));
      loadCounts();
    }
  }

  function onPipelineChange(value: string) {
    const [nextPhase, nextLeadType] = value.split(":") as [Phase, LeadType];
    setPhase(nextPhase);
    setLeadType(nextLeadType);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={`${phase}:${leadType}`}
            onChange={(e) => onPipelineChange(e.target.value)}
            className="min-w-[220px]"
          >
            <optgroup label="Leads">
              {LEAD_TYPES.map((lt) => (
                <option key={`LEAD:${lt}`} value={`LEAD:${lt}`}>
                  {LEAD_TYPE_LABELS[lt]} Leads ({counts[lt]?.LEAD ?? 0})
                </option>
              ))}
            </optgroup>
            <optgroup label="Clients">
              {LEAD_TYPES.map((lt) => (
                <option key={`CLIENT:${lt}`} value={`CLIENT:${lt}`}>
                  {LEAD_TYPE_LABELS[lt]} Clients ({counts[lt]?.CLIENT ?? 0})
                </option>
              ))}
            </optgroup>
          </Select>
          <p className="text-sm text-muted">
            {items.length}{" "}
            {items.length === 1 ? "opportunity" : "opportunities"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-border p-0.5">
            <button
              type="button"
              onClick={() => setView("board")}
              aria-label="Board view"
              title="Board view"
              className={cn(
                "rounded-md p-1.5 transition-colors",
                view === "board"
                  ? "bg-copper/20 text-copper"
                  : "text-muted hover:text-foreground",
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              aria-label="List view"
              title="List view"
              className={cn(
                "rounded-md p-1.5 transition-colors",
                view === "list"
                  ? "bg-copper/20 text-copper"
                  : "text-muted hover:text-foreground",
              )}
            >
              <ListIcon className="h-4 w-4" />
            </button>
          </div>
          <Button variant="primary" onClick={() => setShowAddForm(true)}>
            <Plus className="size-4" />
            {phase === "CLIENT" ? "Submit Policy" : "Add Opportunity"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => setShowManageFields(true)}
          className="flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-foreground"
        >
          <Settings2 className="h-4 w-4" />
          Manage Fields
        </button>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Opportunities"
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : view === "board" ? (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {stages.map((stage) => {
              const stageItems = columns.get(stage.id) ?? [];
              const totalValue =
                stageItems.length === 0
                  ? null
                  : formatCurrency(
                      phase === "CLIENT"
                        ? (stageItems as OpportunityPolicy[]).reduce(
                            (sum, p) => sum + Number(p.annualPremium),
                            0,
                          )
                        : stageItems.length * DEFAULT_LEAD_VALUE,
                    );
              return (
                <BoardColumn
                  key={stage.id}
                  stage={stage}
                  count={stageItems.length}
                  totalValue={totalValue}
                >
                  {stageItems.map((item) =>
                    phase === "LEAD" ? (
                      <LeadCard
                        key={item.id}
                        lead={item as OpportunityLead}
                        fields={fields}
                        onOpen={() => router.push(`/agent/leads/${item.id}`)}
                      />
                    ) : (
                      <PolicyCard
                        key={item.id}
                        policy={item as OpportunityPolicy}
                        fields={fields}
                        onOpen={() =>
                          setEditingPolicy(item as OpportunityPolicy)
                        }
                      />
                    ),
                  )}
                </BoardColumn>
              );
            })}
          </div>
        </DndContext>
      ) : phase === "LEAD" ? (
        <div className="overflow-x-auto rounded-[10px] border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="font-condensed border-b border-border text-[11px] font-bold tracking-[0.1em] text-muted uppercase">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Value</th>
                {leadListFields.map((f) => (
                  <th key={f.key} className="px-4 py-3">
                    {f.label}
                  </th>
                ))}
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {visibleLeads.length === 0 && (
                <tr>
                  <td
                    colSpan={4 + leadListFields.length}
                    className="px-4 py-6 text-center text-muted"
                  >
                    No opportunities in this pipeline yet.
                  </td>
                </tr>
              )}
              {visibleLeads.map((lead) => (
                <tr
                  key={lead.id}
                  className="border-b border-border/60 hover:bg-surface2"
                >
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => router.push(`/agent/leads/${lead.id}`)}
                      className="font-semibold text-white hover:metal-copper-text hover:underline"
                    >
                      {lead.firstName} {lead.lastName}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Select
                        value={lead.pipelineStageId ?? ""}
                        disabled={updatingId === lead.id}
                        onChange={(e) => changeLeadStage(lead, e.target.value)}
                        className="min-w-[160px] py-1 text-xs"
                      >
                        {stages.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {formatCurrency(DEFAULT_LEAD_VALUE)}
                  </td>
                  {leadListFields.map((f) => (
                    <td key={f.key} className="px-4 py-3 text-muted">
                      {LEAD_FIELD_VALUES[f.key]?.(lead) ?? "—"}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-muted">
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[10px] border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="font-condensed border-b border-border text-[11px] font-bold tracking-[0.1em] text-muted uppercase">
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">Carrier</th>
                <th className="px-4 py-3">Commission</th>
                {fields.includes("state") && (
                  <th className="px-4 py-3">State</th>
                )}
                {fields.includes("phone") && (
                  <th className="px-4 py-3">Phone</th>
                )}
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {visiblePolicies.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-6 text-center text-muted">
                    No opportunities in this pipeline yet.
                  </td>
                </tr>
              )}
              {visiblePolicies.map((p) => {
                const isDemo = p.id.startsWith("demo-");
                return (
                  <tr
                    key={p.id}
                    className="border-b border-border/60 hover:bg-surface2"
                  >
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setEditingPolicy(p)}
                        className="font-semibold text-white hover:metal-copper-text hover:underline"
                      >
                        {p.clientName}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Select
                          value={p.pipelineStageId ?? ""}
                          disabled={updatingId === p.id}
                          onChange={(e) => changePolicyStage(p, e.target.value)}
                          className="min-w-[160px] py-1 text-xs"
                        >
                          {stages.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {formatCurrency(p.annualPremium)}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      <CarrierLogo
                        name={p.carrier}
                        className="h-5 w-auto object-contain"
                      />
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {p.commissionAmount
                        ? formatCurrency(p.commissionAmount)
                        : "—"}
                    </td>
                    {fields.includes("state") && (
                      <td className="px-4 py-3 text-muted">{p.state ?? "—"}</td>
                    )}
                    {fields.includes("phone") && (
                      <td className="px-4 py-3 text-muted">
                        {p.clientPhone ?? "—"}
                      </td>
                    )}
                    <td className="px-4 py-3 text-muted">
                      {new Date(
                        p.status === "ISSUED" && p.issuedAt
                          ? p.issuedAt
                          : p.submittedAt,
                      ).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setEditingPolicy(p)}
                        className={cn(
                          "flex items-center gap-1 text-xs font-semibold",
                          p.notes?.trim() || p.followUpAt
                            ? "text-copper hover:text-copper"
                            : "text-muted hover:text-foreground",
                        )}
                      >
                        {p.followUpAt ? (
                          <CalendarClock className="h-3.5 w-3.5" />
                        ) : (
                          <StickyNote className="h-3.5 w-3.5" />
                        )}
                        {p.followUpAt
                          ? new Date(p.followUpAt).toLocaleDateString(
                              undefined,
                              { month: "short", day: "numeric" },
                            )
                          : p.notes?.trim()
                            ? "Notes"
                            : "Add"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {!isDemo && (
                        <button
                          type="button"
                          onClick={() => deletePolicy(p)}
                          disabled={deletingId === p.id}
                          className="text-muted hover:text-red-light disabled:opacity-40"
                          aria-label={`Delete policy for ${p.clientName}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAddForm && phase === "CLIENT" && (
        <Modal
          open
          onClose={() => setShowAddForm(false)}
          title="Submit Policy"
          maxWidthClassName="max-w-lg"
        >
          <PolicySubmitForm
            isAgent={isAgent}
            defaultLeadType={leadType}
            onSubmitted={(policy) => {
              setPolicies((prev) => [
                { ...policy, pipelineStageId: null, leadType },
                ...prev,
              ]);
              setShowAddForm(false);
              loadOpportunities();
              loadCounts();
            }}
          />
        </Modal>
      )}
      {showAddForm && phase === "LEAD" && (
        <Modal
          open
          onClose={() => setShowAddForm(false)}
          title="Add Opportunity"
          maxWidthClassName="max-w-lg"
        >
          <AddOpportunityForm
            defaultLeadType={leadType}
            onAdded={() => {
              setShowAddForm(false);
              loadOpportunities();
              loadCounts();
            }}
          />
        </Modal>
      )}

      {editingPolicy && (
        <Modal
          open
          onClose={() => setEditingPolicy(null)}
          title={editingPolicy.clientName}
          maxWidthClassName="max-w-lg"
        >
          <PolicyEditForm
            policy={editingPolicy}
            carriers={carriers}
            onSaved={(updated) => {
              setPolicies((prev) =>
                prev.map((p) =>
                  p.id === editingPolicy.id ? { ...p, ...updated } : p,
                ),
              );
              loadCounts();
              setEditingPolicy(null);
            }}
          />
        </Modal>
      )}

      {soldLeadPrompt && (
        <Modal
          open
          onClose={() => setSoldLeadPrompt(null)}
          title="Submit Policy"
          maxWidthClassName="max-w-lg"
        >
          <PolicySubmitForm
            isAgent={isAgent}
            defaultLeadType={leadType}
            prefillLead={soldLeadPrompt}
            onSubmitted={() => {
              // The lead stays in this Lead pipeline (now sitting in its
              // Sold stage) as well as showing up in the Client pipeline
              // as its own new Policy — refetch rather than removing it
              // locally, since the server just moved its stage/status.
              setSoldLeadPrompt(null);
              loadOpportunities();
              loadCounts();
            }}
          />
        </Modal>
      )}

      {appointmentPrompt && (
        <Modal
          open
          onClose={() => setAppointmentPrompt(null)}
          title="Book Appointment"
          maxWidthClassName="max-w-md"
        >
          <BookAppointmentForm
            contactName={`${appointmentPrompt.lead.firstName} ${appointmentPrompt.lead.lastName}`.trim()}
            onCancel={() => setAppointmentPrompt(null)}
            onBook={bookAppointment}
            saving={bookingAppointment}
            error={appointmentError}
          />
        </Modal>
      )}

      {showManageFields && (
        <Modal
          open
          onClose={() => setShowManageFields(false)}
          title="Manage Fields"
          maxWidthClassName="max-w-sm"
        >
          <div className="space-y-3">
            <p className="text-sm text-muted">
              Choose which extra fields show on cards and in the list.
            </p>
            {FIELD_OPTIONS[phase].map((opt) => (
              <label
                key={opt.key}
                className="flex items-center gap-2 text-sm text-foreground"
              >
                <input
                  type="checkbox"
                  checked={fields.includes(opt.key)}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...fields, opt.key]
                      : fields.filter((f) => f !== opt.key);
                    setFields(next);
                    saveFieldPrefs(phase, next);
                  }}
                  className="h-4 w-4"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
