"use client";

import { useEffect, useMemo, useState } from "react";
import { LayoutGrid, List as ListIcon, Plus, Trash2 } from "lucide-react";
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
import { Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { CarrierLogo } from "@/components/portal/CarrierLogo";
import { cn } from "@/lib/cn";
import { LEAD_TYPES, LEAD_TYPE_LABELS, type LeadType } from "@/lib/leadType";
import {
  PIPELINE_STAGE_COLOR_CLASSES,
  type PipelineStageColorToken,
} from "@/lib/pipelineStageColors";
import { AddLeadForm } from "@/components/portal/AddLeadForm";
import {
  PolicySubmitForm,
  plansForCarrierName,
  type SubmittedPolicy,
  type CarrierWithPlans,
} from "@/components/portal/PolicySubmitForm";

type Phase = "LEAD" | "CLIENT";
type Role = "ADMIN" | "MANAGER" | "AGENT";
type ViewMode = "board" | "list";

type Stage = {
  id: string;
  phase: Phase;
  name: string;
  order: number;
  colorToken: string;
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
};

type OpportunityPolicy = SubmittedPolicy & {
  pipelineStageId: string | null;
  leadType: LeadType | null;
};

function stageColors(token: string) {
  return (
    PIPELINE_STAGE_COLOR_CLASSES[token as PipelineStageColorToken] ??
    PIPELINE_STAGE_COLOR_CLASSES.muted
  );
}

function formatCurrency(value: string | number) {
  return Number(value).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function LeadCard({
  lead,
  showAgent,
}: {
  lead: OpportunityLead;
  showAgent: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: lead.id });
  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 10,
      }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card
        className={cn(
          "cursor-grab touch-none space-y-1 active:cursor-grabbing",
          isDragging && "opacity-40",
        )}
      >
        <p className="truncate text-sm font-bold text-white">
          {lead.firstName} {lead.lastName}
        </p>
        <p className="text-xs text-muted">
          {lead.phone} &middot; {lead.state}
        </p>
        {showAgent && lead.assignedAgent && (
          <p className="text-[11px] text-muted">{lead.assignedAgent.name}</p>
        )}
      </Card>
    </div>
  );
}

function PolicyCard({
  policy,
  showAgent,
}: {
  policy: OpportunityPolicy;
  showAgent: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: policy.id });
  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 10,
      }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card
        className={cn(
          "cursor-grab touch-none space-y-1 active:cursor-grabbing",
          isDragging && "opacity-40",
        )}
      >
        <p className="truncate text-sm font-bold text-white">
          {policy.clientName}
        </p>
        <p className="text-xs text-muted">
          {policy.carrier} &middot; {formatCurrency(policy.annualPremium)}
        </p>
        {showAgent && policy.agent && (
          <p className="text-[11px] text-muted">{policy.agent.name}</p>
        )}
      </Card>
    </div>
  );
}

function BoardColumn({
  stage,
  children,
}: {
  stage: Stage;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const colors = stageColors(stage.colorToken);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col gap-2 rounded-[10px] border border-border bg-surface2/50 p-3",
        isOver && "border-copper-dim-gradient bg-surface2",
      )}
    >
      <div className="flex items-center gap-2">
        <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", colors.dot)} />
        <h3 className="font-condensed truncate text-xs font-extrabold tracking-[0.08em] text-white uppercase">
          {stage.name}
        </h3>
      </div>
      <div className="flex min-h-[40px] flex-col gap-2">{children}</div>
    </div>
  );
}

export function BookOfBusinessPanel({
  isAgent,
  role,
}: {
  isAgent: boolean;
  role: Role;
}) {
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
  const [carriers, setCarriers] = useState<CarrierWithPlans[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updatingRateId, setUpdatingRateId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const showAgentColumn = role !== "AGENT";
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
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, leadType]);

  const stagesById = useMemo(
    () => new Map(stages.map((s) => [s.id, s])),
    [stages],
  );
  const items: (OpportunityLead | OpportunityPolicy)[] =
    phase === "LEAD" ? leads : policies;

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

  // Rate Plan is optional at submit time, so a policy can end up parked at
  // $0 commission indefinitely with no way to fix it — this lets it be
  // assigned (or changed) after the fact; the server recomputes
  // commissionAmount from the agent's current comp level the moment a plan
  // is attached. Mirrors the original Book of Business table's own handler.
  async function changeRatePlan(
    policy: OpportunityPolicy,
    carrierPlanId: string,
  ) {
    setUpdatingRateId(policy.id);
    const res = await fetch(`/api/portal/policies/${policy.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ carrierPlanId: carrierPlanId || null }),
    });
    setUpdatingRateId(null);
    if (res.ok) {
      const data = await res.json();
      setPolicies((prev) =>
        prev.map((p) => (p.id === policy.id ? { ...p, ...data.policy } : p)),
      );
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
        <Select
          value={`${phase}:${leadType}`}
          onChange={(e) => onPipelineChange(e.target.value)}
          className="min-w-[260px]"
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
                  ? "bg-surface2 text-white"
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
                  ? "bg-surface2 text-white"
                  : "text-muted hover:text-foreground",
              )}
            >
              <ListIcon className="h-4 w-4" />
            </button>
          </div>
          <Button variant="success" onClick={() => setShowAddForm(true)}>
            <Plus className="size-4" />
            Add Opportunity
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : view === "board" ? (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {stages.map((stage) => (
              <BoardColumn key={stage.id} stage={stage}>
                {(columns.get(stage.id) ?? []).map((item) =>
                  phase === "LEAD" ? (
                    <LeadCard
                      key={item.id}
                      lead={item as OpportunityLead}
                      showAgent={showAgentColumn}
                    />
                  ) : (
                    <PolicyCard
                      key={item.id}
                      policy={item as OpportunityPolicy}
                      showAgent={showAgentColumn}
                    />
                  ),
                )}
              </BoardColumn>
            ))}
          </div>
        </DndContext>
      ) : phase === "LEAD" ? (
        <div className="overflow-x-auto rounded-[10px] border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="font-condensed border-b border-border text-[11px] font-bold tracking-[0.1em] text-muted uppercase">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">State</th>
                {showAgentColumn && <th className="px-4 py-3">Agent</th>}
                <th className="px-4 py-3">Stage</th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted">
                    No opportunities in this pipeline yet.
                  </td>
                </tr>
              )}
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="border-b border-border/60 hover:bg-surface2"
                >
                  <td className="px-4 py-3 text-white">
                    {lead.firstName} {lead.lastName}
                  </td>
                  <td className="px-4 py-3 text-muted">{lead.phone}</td>
                  <td className="px-4 py-3 text-muted">{lead.state}</td>
                  {showAgentColumn && (
                    <td className="px-4 py-3 text-muted">
                      {lead.assignedAgent?.name ?? "—"}
                    </td>
                  )}
                  <td className="px-4 py-3">
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
                <th className="px-4 py-3">Carrier</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Annual Premium</th>
                <th className="px-4 py-3">Rate Plan</th>
                <th className="px-4 py-3">Commission</th>
                {showAgentColumn && <th className="px-4 py-3">Agent</th>}
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {policies.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-6 text-center text-muted">
                    No opportunities in this pipeline yet.
                  </td>
                </tr>
              )}
              {policies.map((p) => {
                const isDemo = p.id.startsWith("demo-");
                const carrierMatch = carriers.find(
                  (c) =>
                    c.name.trim().toLowerCase() ===
                    p.carrier.trim().toLowerCase(),
                );
                const scopedPlans = carrierMatch
                  ? plansForCarrierName(carriers, p.carrier)
                  : null;
                return (
                  <tr
                    key={p.id}
                    className="border-b border-border/60 hover:bg-surface2"
                  >
                    <td className="px-4 py-3 text-white">{p.clientName}</td>
                    <td className="px-4 py-3 text-muted">
                      <CarrierLogo
                        name={p.carrier}
                        className="h-5 w-auto object-contain"
                      />
                    </td>
                    <td className="px-4 py-3 text-muted">{p.product ?? "—"}</td>
                    <td className="px-4 py-3 text-muted">{p.state ?? "—"}</td>
                    <td className="px-4 py-3 text-white">
                      {formatCurrency(p.annualPremium)}
                    </td>
                    <td className="px-4 py-3">
                      {isDemo ? (
                        <span className="text-muted">—</span>
                      ) : (
                        <Select
                          value={p.carrierPlanId ?? ""}
                          disabled={updatingRateId === p.id}
                          onChange={(e) => changeRatePlan(p, e.target.value)}
                          className="min-w-[160px] py-1 text-xs"
                        >
                          <option value="">— Not rated —</option>
                          {scopedPlans
                            ? scopedPlans.map((plan) => (
                                <option key={plan.id} value={plan.id}>
                                  {plan.name}
                                </option>
                              ))
                            : carriers.map((c) => (
                                <optgroup key={c.id} label={c.name}>
                                  {c.plans.map((plan) => (
                                    <option key={plan.id} value={plan.id}>
                                      {c.name} — {plan.name}
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                        </Select>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {p.commissionAmount
                        ? formatCurrency(p.commissionAmount)
                        : "—"}
                    </td>
                    {showAgentColumn && (
                      <td className="px-4 py-3 text-muted">
                        {p.agent?.name ?? "—"}
                      </td>
                    )}
                    <td className="px-4 py-3">
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
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {new Date(
                        p.status === "ISSUED" && p.issuedAt
                          ? p.issuedAt
                          : p.submittedAt,
                      ).toLocaleDateString()}
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
          title="Add Opportunity"
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
          <AddLeadForm
            defaultLeadType={leadType}
            onAdded={() => {
              setShowAddForm(false);
              loadOpportunities();
              loadCounts();
            }}
          />
        </Modal>
      )}
    </div>
  );
}
