"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { format } from "date-fns";
import { formatPhone } from "@/lib/formatPhone";
import { LEAD_TYPE_LABELS, LeadType } from "@/lib/leadType";

type Agent = { id: string; name: string; licensedStates: string[] };
type Lead = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  state: string;
  dateOfBirth: string;
  leadType: LeadType;
};

export function AssignPanel({
  stateOptions,
  agents,
}: {
  stateOptions: { state: string; count: number }[];
  agents: Agent[];
}) {
  const [state, setState] = useState(stateOptions[0]?.state ?? "");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [agentId, setAgentId] = useState(agents[0]?.id ?? "");
  const [quickCount, setQuickCount] = useState(300);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!state) return;

    async function loadLeads() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/leads?state=${state}&unassignedOnly=true&page=${page}`);
        const data = await res.json();
        setLeads(data.leads);
        setTotal(data.total);
        setSelected(new Set());
      } finally {
        setLoading(false);
      }
    }

    loadLeads();
  }, [state, page]);

  const currentAgent = agents.find((a) => a.id === agentId);
  const agentLicensedForState = currentAgent?.licensedStates.includes(state);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function toggleAllOnPage() {
    if (selected.size === leads.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(leads.map((l) => l.id)));
    }
  }

  async function assignSelected() {
    if (selected.size === 0 || !agentId) return;
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/admin/leads/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadIds: [...selected], agentId }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setMessage(`Assigned ${data.assigned} lead(s) to ${currentAgent?.name}.`);
      setPage(1);
    } else {
      setMessage(data.error ?? "Assignment failed");
    }
  }

  async function quickAssign() {
    if (!agentId || !state || quickCount <= 0) return;
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/admin/leads/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state, agentId, count: quickCount }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setMessage(`Assigned ${data.assigned} of the requested ${data.requested} lead(s) to ${currentAgent?.name}.`);
      setPage(1);
    } else {
      setMessage(data.error ?? "Assignment failed");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filter by State</CardTitle>
        </CardHeader>
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-40">
            <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">State</label>
            <Select value={state} onChange={(e) => { setState(e.target.value); setPage(1); }}>
              {stateOptions.map((s) => (
                <option key={s.state} value={s.state}>
                  {s.state} ({s.count.toLocaleString()} unassigned)
                </option>
              ))}
            </Select>
          </div>
          <div className="w-56">
            <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">Agent</label>
            <Select value={agentId} onChange={(e) => setAgentId(e.target.value)}>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.licensedStates.join(", ") || "no states"})
                </option>
              ))}
            </Select>
          </div>
        </div>
        {agentId && state && !agentLicensedForState && (
          <p className="mt-3 text-sm text-amber">
            Warning: {currentAgent?.name} is not licensed in {state}.
          </p>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Assign</CardTitle>
        </CardHeader>
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-32">
            <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">Count</label>
            <Input
              type="number"
              min={1}
              value={quickCount}
              onChange={(e) => setQuickCount(Number(e.target.value))}
            />
          </div>
          <Button onClick={quickAssign} disabled={loading || !agentId || !state}>
            Assign Oldest {quickCount} in {state}
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Unassigned Leads in {state} ({total.toLocaleString()})
          </CardTitle>
          <Button variant="secondary" onClick={assignSelected} disabled={selected.size === 0 || loading}>
            Assign Selected ({selected.size})
          </Button>
        </CardHeader>

        {message && <p className="mb-3 text-sm text-teal-light">{message}</p>}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="font-condensed border-b border-border text-[11px] font-bold tracking-[0.1em] text-muted uppercase">
                <th className="py-2 pr-4">
                  <input
                    type="checkbox"
                    checked={leads.length > 0 && selected.size === leads.length}
                    onChange={toggleAllOnPage}
                  />
                </th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Phone</th>
                <th className="py-2 pr-4">DOB</th>
                <th className="py-2 pr-4">Type</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b border-border/60 hover:bg-surface2">
                  <td className="py-2 pr-4">
                    <input type="checkbox" checked={selected.has(lead.id)} onChange={() => toggle(lead.id)} />
                  </td>
                  <td className="py-2 pr-4 text-white">
                    {lead.firstName} {lead.lastName}
                  </td>
                  <td className="py-2 pr-4 text-muted">{formatPhone(lead.phone)}</td>
                  <td className="py-2 pr-4 text-muted">{format(new Date(lead.dateOfBirth), "MM/dd/yyyy")}</td>
                  <td className="py-2 pr-4 text-muted">{LEAD_TYPE_LABELS[lead.leadType]}</td>
                </tr>
              ))}
              {leads.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="py-4 text-muted">
                    No unassigned leads in this state.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted">Page {page}</span>
          <Button variant="ghost" disabled={leads.length < 50} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </Card>
    </div>
  );
}
