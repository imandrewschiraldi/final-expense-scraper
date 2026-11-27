"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import {
  plansForCarrierName,
  type CarrierWithPlans,
} from "@/components/portal/PolicySubmitForm";

export type EditablePolicy = {
  id: string;
  clientName: string;
  clientPhone: string | null;
  state: string | null;
  carrier: string;
  product: string | null;
  annualPremium: string;
  carrierPlanId?: string | null;
  notes?: string | null;
  followUpAt?: string | null;
};

/** Full edit surface for one opportunity — contact info, carrier/rate plan
 *  and value alongside notes/follow-up, all through the one PATCH route
 *  (/api/portal/policies/[id]) that already accepts every one of these
 *  fields independently. Opened by clicking a policy's card or name,
 *  mirroring how a Lead's own detail page is the equivalent "edit the
 *  contact fully" surface for the Lead phase. */
export function PolicyEditForm({
  policy,
  carriers,
  onSaved,
}: {
  policy: EditablePolicy;
  carriers: CarrierWithPlans[];
  onSaved: (policy: Record<string, unknown>) => void;
}) {
  const [clientName, setClientName] = useState(policy.clientName);
  const [clientPhone, setClientPhone] = useState(policy.clientPhone ?? "");
  const [state, setState] = useState(policy.state ?? "");
  const [carrier, setCarrier] = useState(policy.carrier);
  const [product, setProduct] = useState(policy.product ?? "");
  const [annualPremium, setAnnualPremium] = useState(
    String(policy.annualPremium),
  );
  const [carrierPlanId, setCarrierPlanId] = useState(
    policy.carrierPlanId ?? "",
  );
  const [notes, setNotes] = useState(policy.notes ?? "");
  const [followUpAt, setFollowUpAt] = useState(
    policy.followUpAt ? policy.followUpAt.slice(0, 10) : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plansForCarrier = plansForCarrierName(carriers, carrier);

  async function save() {
    setError(null);
    if (!clientName.trim() || !carrier.trim() || !annualPremium) {
      setError("Name, carrier, and value are required.");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/portal/policies/${policy.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim() || null,
        state: state.trim() || null,
        carrier: carrier.trim(),
        product: product.trim() || null,
        annualPremium: Number(annualPremium),
        carrierPlanId: carrierPlanId || null,
        notes: notes.trim() || null,
        followUpAt: followUpAt || null,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to save.");
      return;
    }
    onSaved(data.policy);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Input
          placeholder="Client Name"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
        />
        <Input
          placeholder="Client Phone"
          value={clientPhone}
          onChange={(e) => setClientPhone(e.target.value)}
        />
        <Input
          placeholder="State"
          value={state}
          onChange={(e) => setState(e.target.value)}
        />
        <Input
          placeholder="Value"
          type="number"
          min="0"
          step="0.01"
          value={annualPremium}
          onChange={(e) => setAnnualPremium(e.target.value)}
        />
        <Input
          placeholder="Carrier"
          value={carrier}
          onChange={(e) => setCarrier(e.target.value)}
        />
        <Input
          placeholder="Product"
          value={product}
          onChange={(e) => setProduct(e.target.value)}
        />
      </div>

      {carrier.trim() && (
        <div>
          <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
            Rate Plan
          </label>
          {plansForCarrier.length === 0 ? (
            <p className="text-xs text-muted">
              No rate plans configured for {carrier} yet.
            </p>
          ) : (
            <Select
              value={carrierPlanId}
              onChange={(e) => setCarrierPlanId(e.target.value)}
            >
              <option value="">— Not rated —</option>
              {plansForCarrier.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </Select>
          )}
        </div>
      )}

      <div>
        <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
          Follow-Up Date
        </label>
        <input
          type="date"
          value={followUpAt}
          onChange={(e) => setFollowUpAt(e.target.value)}
          className="w-full rounded-lg border border-copper-focus-gradient bg-surface px-3 py-2 text-sm text-foreground focus:outline-none"
        />
        <p className="mt-1 text-xs text-muted">
          Shows up as a to-do on your Overview page once this date arrives.
        </p>
      </div>
      <div>
        <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Working notes on this opportunity..."
          className="w-full rounded-lg border border-copper-focus-gradient bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none"
        />
      </div>
      {error && <p className="text-sm text-red-light">{error}</p>}
      <Button onClick={save} disabled={saving} className="w-full">
        {saving ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}
