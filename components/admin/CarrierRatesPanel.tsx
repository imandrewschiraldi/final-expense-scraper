"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Trash2 } from "lucide-react";

type Plan = { id: string; name: string; payoutMultiplier: string };
type Carrier = { id: string; name: string; plans: Plan[] };

const pct = (multiplier: string) => `${(Number(multiplier) * 100).toFixed(2).replace(/\.?0+$/, "")}%`;

function AddPlanForm({ carrierId, onAdded }: { carrierId: string; onAdded: () => void }) {
  const [name, setName] = useState("");
  const [payoutPercent, setPayoutPercent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim() || !payoutPercent) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/carriers/${carrierId}/plans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), payoutPercent: Number(payoutPercent) }),
    });
    setSaving(false);
    if (res.ok) {
      setName("");
      setPayoutPercent("");
      onAdded();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Failed to add plan");
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-end gap-2">
      <Input placeholder="Plan name (e.g. HMS 125)" value={name} onChange={(e) => setName(e.target.value)} className="w-48" />
      <Input
        placeholder="Payout %"
        type="number"
        min="0"
        max="200"
        step="0.01"
        value={payoutPercent}
        onChange={(e) => setPayoutPercent(e.target.value)}
        className="w-28"
      />
      <Button variant="secondary" onClick={submit} disabled={saving || !name.trim() || !payoutPercent}>
        {saving ? "Adding..." : "Add Plan"}
      </Button>
      {error && <p className="w-full text-xs text-red-light">{error}</p>}
    </div>
  );
}

export function CarrierRatesPanel() {
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCarrierName, setNewCarrierName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/carriers");
    if (res.ok) setCarriers((await res.json()).carriers);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addCarrier() {
    if (!newCarrierName.trim()) return;
    setCreating(true);
    setError(null);
    const res = await fetch("/api/admin/carriers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCarrierName.trim() }),
    });
    setCreating(false);
    if (res.ok) {
      setNewCarrierName("");
      load();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Failed to add carrier");
    }
  }

  async function deleteCarrier(id: string, name: string) {
    if (!window.confirm(`Delete "${name}" and every rate plan under it? Policies already sold under it keep their commission amount, they just lose the link.`)) return;
    const res = await fetch(`/api/admin/carriers/${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  async function deletePlan(id: string, name: string) {
    if (!window.confirm(`Delete "${name}"? Policies already sold under it keep their commission amount, they just lose the link.`)) return;
    const res = await fetch(`/api/admin/carriers/plans/${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Carrier</CardTitle>
        </CardHeader>
        <p className="mb-3 text-sm text-muted">
          Once a carrier is added, give it one or more rate plans below — each plan&apos;s payout % is how much of an
          agent&apos;s own comp level that plan pays out. This is what drives the Commissions Paid figure on the
          Dashboard.
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <Input
            placeholder="Carrier name (e.g. Americo)"
            value={newCarrierName}
            onChange={(e) => setNewCarrierName(e.target.value)}
            className="w-64"
          />
          <Button onClick={addCarrier} disabled={creating || !newCarrierName.trim()}>
            {creating ? "Adding..." : "Add Carrier"}
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-red-light">{error}</p>}
      </Card>

      {loading && <p className="text-sm text-muted">Loading...</p>}

      {!loading && carriers.length === 0 && (
        <p className="text-sm text-muted">No carriers yet — add one above to start rating plans.</p>
      )}

      {carriers.map((carrier) => (
        <Card key={carrier.id}>
          <CardHeader>
            <CardTitle>{carrier.name}</CardTitle>
            <Button variant="ghost" onClick={() => deleteCarrier(carrier.id, carrier.name)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </CardHeader>

          {carrier.plans.length === 0 ? (
            <p className="text-sm text-muted">No rate plans yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="font-condensed border-b border-border text-[11px] font-bold tracking-[0.1em] text-muted uppercase">
                  <th className="py-2 pr-4">Plan</th>
                  <th className="py-2 pr-4">Payout %</th>
                  <th className="py-2 pr-4" />
                </tr>
              </thead>
              <tbody>
                {carrier.plans.map((plan) => (
                  <tr key={plan.id} className="border-b border-border/60">
                    <td className="py-2 pr-4 text-white">{plan.name}</td>
                    <td className="py-2 pr-4 text-muted">{pct(plan.payoutMultiplier)}</td>
                    <td className="py-2 pr-4 text-right">
                      <button
                        type="button"
                        onClick={() => deletePlan(plan.id, plan.name)}
                        aria-label={`Delete ${plan.name}`}
                        className="text-muted hover:text-red-light"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <AddPlanForm carrierId={carrier.id} onAdded={load} />
        </Card>
      ))}
    </div>
  );
}
