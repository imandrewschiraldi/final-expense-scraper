"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { PRODUCTS } from "@/lib/products";
import { LEAD_TYPES, LEAD_TYPE_LABELS, type LeadType } from "@/lib/leadType";

const POLICY_STATUSES = ["SUBMITTED", "ISSUED", "CHARGEBACK"] as const;
export type PolicyStatus = (typeof POLICY_STATUSES)[number];

const STATUS_LABELS: Record<PolicyStatus, string> = {
  SUBMITTED: "Submitted",
  ISSUED: "Issued",
  CHARGEBACK: "Chargeback",
};

const POLICY_LINES = ["LIFE", "ANNUITY"] as const;
export type PolicyLine = (typeof POLICY_LINES)[number];

const LINE_LABELS: Record<PolicyLine, string> = {
  LIFE: "Life",
  ANNUITY: "Annuity",
};

export type SubmittedPolicy = {
  id: string;
  clientName: string;
  clientPhone: string | null;
  state: string | null;
  carrier: string;
  product: string | null;
  line: PolicyLine;
  annualPremium: string;
  monthlyPremium?: string | null;
  policyNumber?: string | null;
  effectiveDate?: string | null;
  beneficiaryName?: string | null;
  beneficiaryRelationship?: string | null;
  status: PolicyStatus;
  submittedAt: string;
  issuedAt: string | null;
  agent: { name: string } | null;
  carrierPlanId?: string | null;
  commissionAmount?: string | null;
};

type SoldLead = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  state: string;
  leadType: LeadType;
};
export type CarrierPlan = { id: string; name: string };
export type CarrierWithPlans = {
  id: string;
  name: string;
  plans: CarrierPlan[];
};

/** The plans for one named carrier, scoping a Rate Plan picker so it never
 *  shows another carrier's products (e.g. Ethos's products for a Corebridge
 *  sale). Matches case/whitespace-insensitively since free-text `carrier`
 *  values on older policies may not byte-match the Carrier record's name. */
export function plansForCarrierName(
  carriers: CarrierWithPlans[],
  carrierName: string | null | undefined,
): CarrierPlan[] {
  if (!carrierName?.trim()) return [];
  const norm = carrierName.trim().toLowerCase();
  return (
    carriers.find((c) => c.name.trim().toLowerCase() === norm)?.plans ?? []
  );
}

const emptyForm = {
  leadId: "",
  clientName: "",
  clientPhone: "",
  state: "",
  carrier: "",
  product: "",
  line: "LIFE" as PolicyLine,
  annualPremium: "",
  monthlyPremium: "",
  policyNumber: "",
  effectiveDate: "",
  beneficiaryName: "",
  beneficiaryRelationship: "",
  status: "SUBMITTED" as PolicyStatus,
  carrierPlanId: "",
  leadType: "" as LeadType | "",
};

export function PolicySubmitForm({
  isAgent,
  defaultLeadType,
  prefillLead,
  onSubmitted,
}: {
  isAgent: boolean;
  // Pre-tags the policy with the pipeline it was added from (Book of
  // Business's "+ Add Opportunity" on a Client pipeline) — overridden by
  // the linked lead's own leadType if one is picked below, same as the
  // server already does when a leadId is submitted without an explicit one.
  defaultLeadType?: LeadType;
  // Seeds the form from a specific Lead up front — used when Book of
  // Business pops this form open automatically because a Lead was just
  // dragged/moved to a "Sold" stage (see BookOfBusinessPanel). Distinct
  // from the "Link to a Sold Lead" picker below, which only lists leads
  // already archived with status SOLD — this lead hasn't been marked sold
  // yet; that only happens once this form is actually submitted (the
  // server moves it out of the Lead pipeline at that point).
  prefillLead?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    state: string;
  };
  onSubmitted: (policy: SubmittedPolicy) => void;
}) {
  const [soldLeads, setSoldLeads] = useState<SoldLead[]>([]);
  const [carriers, setCarriers] = useState<CarrierWithPlans[]>([]);
  const [form, setForm] = useState(() =>
    prefillLead
      ? {
          ...emptyForm,
          leadId: prefillLead.id,
          clientName: `${prefillLead.firstName} ${prefillLead.lastName}`.trim(),
          clientPhone: prefillLead.phone,
          state: prefillLead.state,
        }
      : emptyForm,
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Off by default: pick a real carrier so the Rate Plan list below scopes
  // to it. Only drops to free text for a carrier that isn't set up yet.
  const [manualCarrier, setManualCarrier] = useState(false);
  // Only the standalone Submit Policy page (no defaultLeadType, no
  // prefillLead) needs to ask which pipeline a manually-entered policy
  // belongs to — Book of Business always already knows (either the
  // pipeline it was opened from, or the lead being moved to Sold), and a
  // linked "sold lead" pick below always wins server-side regardless of
  // what's chosen here.
  const needsLeadTypePicker = !defaultLeadType && !prefillLead;

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
      const stillValid = plansForCarrierName(carriers, carrier).some(
        (p) => p.id === f.carrierPlanId,
      );
      return {
        ...f,
        carrier,
        carrierPlanId: stillValid ? f.carrierPlanId : "",
      };
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
      leadType: lead ? lead.leadType : f.leadType,
    }));
  }

  async function submitDeal() {
    setError(null);
    if (
      !form.clientName.trim() ||
      !form.carrier.trim() ||
      !form.annualPremium
    ) {
      setError("Client name, carrier, and annual premium are required.");
      return;
    }
    if (needsLeadTypePicker && !form.leadType) {
      setError("Pick which pipeline this policy belongs to.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/portal/policies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        leadId: form.leadId || undefined,
        leadType: defaultLeadType ?? form.leadType ?? undefined,
        annualPremium: Number(form.annualPremium),
        monthlyPremium: form.monthlyPremium ? Number(form.monthlyPremium) : undefined,
        policyNumber: form.policyNumber.trim() || undefined,
        effectiveDate: form.effectiveDate || undefined,
        beneficiaryName: form.beneficiaryName.trim() || undefined,
        beneficiaryRelationship: form.beneficiaryRelationship.trim() || undefined,
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
          <Select
            value={form.leadId}
            onChange={(e) => onLeadSelect(e.target.value)}
          >
            <option value="">— Manual entry —</option>
            {soldLeads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.firstName} {l.lastName} ({l.state})
              </option>
            ))}
          </Select>
        </div>
      )}
      {needsLeadTypePicker && (
        <div>
          <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
            Pipeline
          </label>
          <Select
            value={form.leadType}
            onChange={(e) =>
              setForm((f) => ({ ...f, leadType: e.target.value as LeadType }))
            }
          >
            <option value="">— Select Pipeline —</option>
            {LEAD_TYPES.map((lt) => (
              <option key={lt} value={lt}>
                {LEAD_TYPE_LABELS[lt]}
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
        <Input
          placeholder="State"
          value={form.state}
          onChange={(e) => setForm({ ...form, state: e.target.value })}
        />
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
            <Select
              value={form.carrier}
              onChange={(e) => onCarrierSelect(e.target.value)}
            >
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
        <Select
          value={form.product}
          onChange={(e) => {
            const product = e.target.value;
            // Picking the Annuities product defaults Line of Business to
            // Annuity too — still overridable below, just saves the extra
            // click on the common case.
            setForm((f) => ({
              ...f,
              product,
              line: product === "Annuities" ? "ANNUITY" : f.line,
            }));
          }}
        >
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
      <div>
        <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
          Line of Business
        </label>
        <Select
          value={form.line}
          onChange={(e) =>
            setForm({ ...form, line: e.target.value as PolicyLine })
          }
        >
          {POLICY_LINES.map((l) => (
            <option key={l} value={l}>
              {LINE_LABELS[l]}
            </option>
          ))}
        </Select>
      </div>
      {form.carrier.trim() && (
        <div>
          <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
            Rate Plan (optional — drives Commissions Paid)
          </label>
          {plansForCarrier.length === 0 ? (
            <p className="text-xs text-muted">
              No rate plans configured for {form.carrier} yet.
            </p>
          ) : (
            <Select
              value={form.carrierPlanId}
              onChange={(e) =>
                setForm((f) => ({ ...f, carrierPlanId: e.target.value }))
              }
            >
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
          Policy Details (optional — fill in as they become known)
        </label>
        <div className="grid grid-cols-2 gap-3">
          <Input
            placeholder="Policy Number"
            value={form.policyNumber}
            onChange={(e) => setForm({ ...form, policyNumber: e.target.value })}
          />
          <Input
            placeholder="Monthly Premium"
            type="number"
            min="0"
            step="0.01"
            value={form.monthlyPremium}
            onChange={(e) => setForm({ ...form, monthlyPremium: e.target.value })}
          />
          <div>
            <label className="mb-1 block text-xs text-muted">Effective / Draft Date</label>
            <input
              type="date"
              value={form.effectiveDate}
              onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })}
              className="w-full rounded-lg border border-copper-focus-gradient bg-surface px-3 py-2 text-sm text-foreground focus:outline-none"
            />
          </div>
          <Input
            placeholder="Beneficiary Name"
            value={form.beneficiaryName}
            onChange={(e) => setForm({ ...form, beneficiaryName: e.target.value })}
          />
          <Input
            placeholder="Beneficiary Relationship"
            value={form.beneficiaryRelationship}
            onChange={(e) => setForm({ ...form, beneficiaryRelationship: e.target.value })}
          />
        </div>
      </div>
      <div>
        <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
          Status
        </label>
        <Select
          value={form.status}
          onChange={(e) =>
            setForm({ ...form, status: e.target.value as PolicyStatus })
          }
        >
          {POLICY_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </div>
      {error && <p className="text-sm text-red-light">{error}</p>}
      <Button onClick={submitDeal} disabled={saving}>
        {saving ? "Submitting..." : "Submit Policy"}
      </Button>
    </div>
  );
}
