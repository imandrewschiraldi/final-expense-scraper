"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { PRODUCTS } from "@/lib/products";

const POLICY_STATUSES = ["SUBMITTED", "ISSUED", "CHARGEBACK"] as const;
export type PolicyStatus = (typeof POLICY_STATUSES)[number];

const STATUS_LABELS: Record<PolicyStatus, string> = {
  SUBMITTED: "Submitted",
  ISSUED: "Issued",
  CHARGEBACK: "Chargeback",
};

export type SubmittedPolicy = {
  id: string;
  clientName: string;
  clientPhone: string | null;
  state: string | null;
  carrier: string;
  product: string | null;
  annualPremium: string;
  status: PolicyStatus;
  submittedAt: string;
  issuedAt: string | null;
  agent: { name: string } | null;
  carrierPlanId?: string | null;
  commissionAmount?: string | null;
};

type SoldLead = { id: string; firstName: string; lastName: string; phone: string; state: string };
export type CarrierPlan = { id: string; name: string };
export type CarrierWithPlans = { id: string; name: string; plans: CarrierPlan[] };

/** The plans for one named carrier, scoping a Rate Plan picker so it never
 *  shows another carrier's products (e.g. Ethos's products for a Corebridge
 *  sale). Matches case/whitespace-insensitively since free-text `carrier`
 *  values on older policies may not byte-match the Carrier record's name. */
export function plansForCarrierName(carriers: CarrierWithPlans[], carrierName: string | null | undefined): CarrierPlan[] {
  if (!carrierName?.trim()) return [];
  const norm = carrierName.trim().toLowerCase();
  return carriers.find((c) => c.name.trim().toLowerCase() === norm)?.plans ?? [];
}

const emptyForm = {
  leadId: "",
  clientName: "",
  clientPhone: "",
  state: "",
  carrier: "",
  product: "",
  annualPremium: "",
  status: "SUBMITTED" as PolicyStatus,
  carrierPlanId: "",
};

export function PolicySubmitForm({
  isAgent,
  onSubmitted,
}: {
  isAgent: boolean;
  onSubmitted: (policy: SubmittedPolicy) => void;
}) {
  const [soldLeads, setSoldLeads] = useState<SoldLead[]>([]);
  const [carriers, setCarriers] = useState<CarrierWithPlans[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Off by default: pick a real carrier so the Rate Plan list below scopes
  // to it. Only drops to free text for a carrier that isn't set up yet.
  const [manualCarrier, setManualCarrier] = useState(false);

  useEffect(() => {
    if (isAgent) {
      fetch("/api/agent/leads?archived=true&status=SOLD")
        .then((res) => (res.ok ? res.json() : { leads: [] }))
        .then((data) => setSoldLeads(data.leads ?? []))
        .catch(() => setSoldLeads([]));
    }
  }, [isAgent]);

  useEffect(() => {
    fetch("/api/portal/carrier-plans")
      .then((res) => (res.ok ? res.json() : { carriers: [] }))
      .then((data) => setCarriers(data.carriers ?? []))
      .catch(() => setCarriers([]));
  }, []);

  // The Rate Plan list is scoped to whichever carrier is selected — a
  // policy sold with Corebridge should never offer Ethos's products.
  const plansForCarrier = plansForCarrierName(carriers, form.carrier);

  function onCarrierSelect(carrier: string) {
    setForm((f) => {
      const stillValid = plansForCarrierName(carriers, carrier).some((p) => p.id === f.carrierPlanId);
      return { ...f, carrier, carrierPlanId: stillValid ? f.carrierPlanId : "" };
    });
  }

  function onLeadSelect(leadId: string) {
    const lead = soldLeads.find((l) => l.id === leadId);
    setForm((f) => ({
      ...f,
      leadId,
      clientName: lead ? `${lead.firstName} ${lead.lastName}` : f.clientName,
      clientPhone: lead ? lead.phone : f.clientPhone,
      state: lead ? lead.state : f.state,
    }));
  }

  async function submitDeal() {
    setError(null);
    if (!form.clientName.trim() || !form.carrier.trim() || !form.annualPremium) {
      setError("Client name, carrier, and annual premium are required.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/portal/policies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        leadId: form.leadId || undefined,
        annualPremium: Number(form.annualPremium),
        carrierPlanId: form.carrierPlanId || undefined,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to submit deal");
      return;
    }
    onSubmitted({ ...data.policy, agent: null });
    setForm(emptyForm);
  }

  return (
    <div className="space-y-3">
      {isAgent && soldLeads.length > 0 && (
        <div>
          <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
            Link to a Sold Lead (optional)
          </label>
          <Select value={form.leadId} onChange={(e) => onLeadSelect(e.target.value)}>
            <option value="">— Manual entry —</option>
            {soldLeads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.firstName} {l.lastName} ({l.state})
              </option>
            ))}
          </Select>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Input
          placeholder="Client Name"
          value={form.clientName}
          onChange={(e) => setForm({ ...form, clientName: e.target.value })}
        />
        <Input
          placeholder="Client Phone"
          value={form.clientPhone}
          onChange={(e) => setForm({ ...form, clientPhone: e.target.value })}
        />
        <Input placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
        {manualCarrier || carriers.length === 0 ? (
          <div className="flex gap-1.5">
            <Input
              placeholder="Carrier"
              value={form.carrier}
              onChange={(e) => setForm({ ...form, carrier: e.target.value })}
            />
            {carriers.length > 0 && (
              <button
                type="button"
                onClick={() => setManualCarrier(false)}
                className="shrink-0 text-xs whitespace-nowrap text-muted underline hover:text-primary"
              >
                Pick from list
              </button>
            )}
          </div>
        ) : (
          <div className="flex gap-1.5">
            <Select value={form.carrier} onChange={(e) => onCarrierSelect(e.target.value)}>
              <option value="">— Select Carrier —</option>
              {carriers.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </Select>
            <button
              type="button"
              onClick={() => setManualCarrier(true)}
              className="shrink-0 text-xs whitespace-nowrap text-muted underline hover:text-primary"
            >
              Not listed
            </button>
          </div>
        )}
        <Select value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })}>
          <option value="">— Select Product —</option>
          {PRODUCTS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
        <Input
          placeholder="Annual Premium"
          type="number"
          min="0"
          step="0.01"
          value={form.annualPremium}
          onChange={(e) => setForm({ ...form, annualPremium: e.target.value })}
        />
      </div>
      {form.carrier.trim() && (
        <div>
          <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
            Rate Plan (optional — drives Commissions Paid)
          </label>
          {plansForCarrier.length === 0 ? (
            <p className="text-xs text-muted">No rate plans configured for {form.carrier} yet.</p>
          ) : (
            <Select value={form.carrierPlanId} onChange={(e) => setForm((f) => ({ ...f, carrierPlanId: e.target.value }))}>
              <option value="">— Not rated —</option>
              {plansForCarrier.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          )}
        </div>
      )}
      <div>
        <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
          Status
        </label>
        <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as PolicyStatus })}>
          {POLICY_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </div>
      {error && <p className="text-sm text-red-light">{error}</p>}
      <Button onClick={submitDeal} disabled={saving}>
        {saving ? "Submitting..." : "Submit Deal"}
      </Button>
    </div>
  );
}
