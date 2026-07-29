"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";

type Policy = {
  id: string;
  clientName: string;
  clientPhone: string | null;
  state: string | null;
  carrier: string;
  product: string | null;
  annualPremium: string;
  status: "SUBMITTED" | "ISSUED";
  submittedAt: string;
  issuedAt: string | null;
  agent: { name: string } | null;
};

type SoldLead = { id: string; firstName: string; lastName: string; phone: string; state: string };

const emptyForm = {
  leadId: "",
  clientName: "",
  clientPhone: "",
  state: "",
  carrier: "",
  product: "",
  annualPremium: "",
  status: "SUBMITTED" as "SUBMITTED" | "ISSUED",
};

function formatCurrency(value: string | number) {
  return Number(value).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function BookOfBusinessPanel({ isAgent }: { isAgent: boolean }) {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [soldLeads, setSoldLeads] = useState<SoldLead[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/portal/policies?mine=true")
      .then((res) => res.json())
      .then((data) => {
        setPolicies(data.policies ?? []);
        setLoading(false);
      });

    if (isAgent) {
      fetch("/api/agent/leads?archived=true&status=SOLD")
        .then((res) => res.json())
        .then((data) => setSoldLeads(data.leads ?? []));
    }
  }, [isAgent]);

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
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to submit deal");
      return;
    }
    setPolicies((prev) => [{ ...data.policy, agent: null }, ...prev]);
    setForm(emptyForm);
    setShowForm(false);
  }

  async function markIssued(policy: Policy) {
    setUpdatingId(policy.id);
    const res = await fetch(`/api/portal/policies/${policy.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ISSUED" }),
    });
    setUpdatingId(null);
    if (res.ok) {
      const data = await res.json();
      setPolicies((prev) => prev.map((p) => (p.id === policy.id ? data.policy : p)));
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>My Book of Business</CardTitle>
          <Button onClick={() => setShowForm((s) => !s)}>{showForm ? "Cancel" : "Submit Deal"}</Button>
        </CardHeader>

        {showForm && (
          <div className="mb-6 space-y-3 rounded-[10px] border border-copper-dim bg-surface2 p-4">
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
              <Input
                placeholder="State"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
              />
              <Input
                placeholder="Carrier"
                value={form.carrier}
                onChange={(e) => setForm({ ...form, carrier: e.target.value })}
              />
              <Input
                placeholder="Product"
                value={form.product}
                onChange={(e) => setForm({ ...form, product: e.target.value })}
              />
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
                Status
              </label>
              <Select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as "SUBMITTED" | "ISSUED" })}
              >
                <option value="SUBMITTED">Submitted</option>
                <option value="ISSUED">Issued</option>
              </Select>
            </div>
            {error && <p className="text-sm text-red-light">{error}</p>}
            <Button onClick={submitDeal} disabled={saving}>
              {saving ? "Submitting..." : "Submit Deal"}
            </Button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="font-condensed border-b border-border text-[11px] font-bold tracking-[0.1em] text-muted uppercase">
                <th className="py-2 pr-4">Client</th>
                <th className="py-2 pr-4">Carrier</th>
                <th className="py-2 pr-4">Product</th>
                <th className="py-2 pr-4">State</th>
                <th className="py-2 pr-4">Annual Premium</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {!loading && policies.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-muted">
                    No deals submitted yet.
                  </td>
                </tr>
              )}
              {policies.map((p) => (
                <tr key={p.id} className="border-b border-border/60 hover:bg-surface2">
                  <td className="py-2 pr-4 text-white">{p.clientName}</td>
                  <td className="py-2 pr-4 text-muted">{p.carrier}</td>
                  <td className="py-2 pr-4 text-muted">{p.product ?? "—"}</td>
                  <td className="py-2 pr-4 text-muted">{p.state ?? "—"}</td>
                  <td className="py-2 pr-4 text-white">{formatCurrency(p.annualPremium)}</td>
                  <td className="py-2 pr-4">
                    <span className={p.status === "ISSUED" ? "text-green-light" : "text-teal-light"}>
                      {p.status === "ISSUED" ? "Issued" : "Submitted"}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-muted">
                    {new Date(p.status === "ISSUED" && p.issuedAt ? p.issuedAt : p.submittedAt).toLocaleDateString()}
                  </td>
                  <td className="py-2 pr-4">
                    {p.status === "SUBMITTED" && (
                      <Button variant="success" onClick={() => markIssued(p)} disabled={updatingId === p.id}>
                        {updatingId === p.id ? "Saving..." : "Mark Issued"}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
