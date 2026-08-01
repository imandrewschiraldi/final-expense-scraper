"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { PolicySubmitForm, type PolicyStatus, type SubmittedPolicy } from "@/components/portal/PolicySubmitForm";

const POLICY_STATUSES = ["SUBMITTED", "ISSUED", "CHARGEBACK"] as const;

const STATUS_LABELS: Record<PolicyStatus, string> = {
  SUBMITTED: "Submitted",
  ISSUED: "Issued",
  CHARGEBACK: "Chargeback",
};

const STATUS_TEXT_COLOR: Record<PolicyStatus, string> = {
  SUBMITTED: "text-blue-light",
  ISSUED: "text-green-light",
  CHARGEBACK: "text-red-light",
};

type Policy = SubmittedPolicy;

function formatCurrency(value: string | number) {
  return Number(value).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function BookOfBusinessPanel({ isAgent }: { isAgent: boolean }) {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/portal/policies?mine=true")
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? `Failed to load policies (${res.status})`);
        }
        return res.json();
      })
      .then((data) => {
        setPolicies(data.policies ?? []);
        setLoading(false);
        setLoadError(null);
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : "Failed to load your book of business.");
        setLoading(false);
      });
  }, []);

  async function changeStatus(policy: Policy, status: PolicyStatus) {
    setUpdatingId(policy.id);
    const res = await fetch(`/api/portal/policies/${policy.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
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
          <div className="mb-6 rounded-[10px] border border-copper-dim bg-surface2 p-4">
            <PolicySubmitForm
              isAgent={isAgent}
              onSubmitted={(policy) => {
                setPolicies((prev) => [policy, ...prev]);
                setShowForm(false);
              }}
            />
          </div>
        )}

        {loadError && <p className="mb-3 text-sm text-red-light">{loadError}</p>}

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
              {!loading && !loadError && policies.length === 0 && (
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
                    <span className={STATUS_TEXT_COLOR[p.status]}>{STATUS_LABELS[p.status]}</span>
                  </td>
                  <td className="py-2 pr-4 text-muted">
                    {new Date(p.status === "ISSUED" && p.issuedAt ? p.issuedAt : p.submittedAt).toLocaleDateString()}
                  </td>
                  <td className="py-2 pr-4">
                    <Select
                      value={p.status}
                      disabled={updatingId === p.id}
                      onChange={(e) => changeStatus(p, e.target.value as PolicyStatus)}
                      className="min-w-[130px] py-1 text-xs"
                    >
                      {POLICY_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </Select>
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
