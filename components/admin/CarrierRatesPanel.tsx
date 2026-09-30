"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Trash2, ChevronDown, ChevronRight, Pencil } from "lucide-react";

type Rate = { compLevel: number; payoutPercent: string };
type Plan = { id: string; name: string; payoutMultiplier: string; rates: Rate[] };
type Carrier = { id: string; name: string; plans: Plan[] };

const pct = (fraction: number | string) => `${(Number(fraction) * 100).toFixed(2).replace(/\.?0+$/, "")}%`;

/**
 * Parses pasted grid text into {compLevel, payoutPercent} rows. Accepts one row per line in
 * pretty much any format containing two numbers ("80 65", "80, 65.00%", "80\t0.65"...) — the
 * first number on the line is the comp level, the second is the payout. A second number <= 3
 * is treated as a fraction (e.g. 0.65) and converted to a percent (65); anything larger is
 * treated as already a percent, so both a raw JSON dump and a copy-pasted rate sheet work.
 */
function parseGridPaste(text: string): { compLevel: number; payoutPercent: number }[] {
  const rows: { compLevel: number; payoutPercent: number }[] = [];
  for (const line of text.split("\n")) {
    const nums = line.match(/\d+(?:\.\d+)?/g);
    if (!nums || nums.length < 2) continue;
    const compLevel = Number(nums[0]);
    let payoutPercent = Number(nums[1]);
    if (!Number.isFinite(compLevel) || !Number.isFinite(payoutPercent) || compLevel <= 0 || payoutPercent <= 0) continue;
    if (payoutPercent <= 3) payoutPercent *= 100;
    rows.push({ compLevel, payoutPercent });
  }
  return rows;
}

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

function CarrierName({ carrier, onRenamed }: { carrier: Carrier; onRenamed: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(carrier.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function cancel() {
    setEditing(false);
    setName(carrier.name);
    setError(null);
  }

  async function save() {
    const cleaned = name.trim();
    if (!cleaned || cleaned === carrier.name) {
      cancel();
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/carriers/${carrier.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: cleaned }),
    });
    setSaving(false);
    if (res.ok) {
      setEditing(false);
      onRenamed();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Failed to rename carrier");
    }
  }

  if (editing) {
    return (
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          autoFocus
          className="w-56"
        />
        <Button variant="secondary" onClick={save} disabled={saving || !name.trim()}>
          {saving ? "Saving..." : "Save"}
        </Button>
        <Button variant="ghost" onClick={cancel}>
          Cancel
        </Button>
        {error && <p className="w-full text-xs text-red-light">{error}</p>}
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-2">
      <CardTitle>{carrier.name}</CardTitle>
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label={`Rename ${carrier.name}`}
        className="text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-primary"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function PlanGrid({ plan, onChanged }: { plan: Plan; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function importGrid() {
    const rows = parseGridPaste(text);
    if (rows.length === 0) {
      setError("Couldn't find any valid level/payout rows in that paste");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/carriers/plans/${plan.id}/rates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    });
    setSaving(false);
    if (res.ok) {
      setText("");
      onChanged();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Failed to import grid");
    }
  }

  async function clearGrid() {
    if (!window.confirm(`Clear the payout grid for "${plan.name}"? It'll fall back to the flat ${pct(plan.payoutMultiplier)} payout.`)) return;
    const res = await fetch(`/api/admin/carriers/plans/${plan.id}/rates`, { method: "DELETE" });
    if (res.ok) onChanged();
  }

  return (
    <div className="py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 text-sm text-white hover:text-primary"
        >
          {open ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
          {plan.name}
        </button>
        <span className="text-sm text-muted">
          {plan.rates.length > 0 ? `${plan.rates.length}-level grid · fallback ${pct(plan.payoutMultiplier)}` : `${pct(plan.payoutMultiplier)} flat`}
        </span>
      </div>

      {open && (
        <div className="mt-2 space-y-2 pl-5">
          {plan.rates.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              {plan.rates.map((r) => (
                <span key={r.compLevel}>
                  <span className="text-white">{r.compLevel}</span>: {pct(r.payoutPercent)}
                </span>
              ))}
            </div>
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"Paste the carrier's grid, one level per line, e.g.\n80  65.00%\n85  68.00%\n90  70.00%\n..."}
            rows={4}
            className="w-full rounded-md border border-border bg-black/20 px-3 py-2 text-xs text-white placeholder:text-muted focus:border-primary focus:outline-none"
          />
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={importGrid} disabled={saving || !text.trim()}>
              {saving ? "Importing..." : "Import Grid"}
            </Button>
            {plan.rates.length > 0 && (
              <Button variant="ghost" onClick={clearGrid}>
                Clear Grid
              </Button>
            )}
          </div>
          {error && <p className="text-xs text-red-light">{error}</p>}
        </div>
      )}
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
          Once a carrier is added, give it one or more rate plans below. A plan&apos;s Payout % is a flat fallback rate;
          click a plan to paste in its real row-by-row grid (e.g. a comp-level table from 80 to 145) so each level pays
          exactly what the carrier contracts for. This is what drives the Commissions Paid figure on the Dashboard.
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
            <CarrierName carrier={carrier} onRenamed={load} />
            <Button variant="ghost" onClick={() => deleteCarrier(carrier.id, carrier.name)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </CardHeader>

          {carrier.plans.length === 0 ? (
            <p className="text-sm text-muted">No rate plans yet.</p>
          ) : (
            <div className="divide-y divide-border/60">
              {carrier.plans.map((plan) => (
                <div key={plan.id} className="flex items-start gap-2">
                  <div className="flex-1">
                    <PlanGrid plan={plan} onChanged={load} />
                  </div>
                  <button
                    type="button"
                    onClick={() => deletePlan(plan.id, plan.name)}
                    aria-label={`Delete ${plan.name}`}
                    className="mt-2.5 text-muted hover:text-red-light"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <AddPlanForm carrierId={carrier.id} onAdded={load} />
        </Card>
      ))}
    </div>
  );
}
