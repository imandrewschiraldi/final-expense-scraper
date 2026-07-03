"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { format } from "date-fns";
import { formatPhone } from "@/lib/formatPhone";
import { LEAD_TYPE_LABELS, LEAD_TYPES, LeadType } from "@/lib/leadType";
import { LEAD_STATUS_LABELS, LEAD_STATUSES, LeadStatus } from "@/lib/leadStatus";
import { US_STATES } from "@/lib/usStates";

type Lead = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  state: string;
  dateOfBirth: string;
  leadType: LeadType;
  status: LeadStatus;
  isArchived: boolean;
  assignedAgent: { id: string; name: string } | null;
};

type StateCount = { state: string; count: number };

export function AllLeadsPanel() {
  const [stateFilter, setStateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [leadTypeFilter, setLeadTypeFilter] = useState("");
  const [archivedFilter, setArchivedFilter] = useState<"any" | "true" | "false">("any");

  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [stateCounts, setStateCounts] = useState<StateCount[]>([]);
  const [deleteStateValue, setDeleteStateValue] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [mergeFrom, setMergeFrom] = useState<Set<string>>(new Set());
  const [mergeTo, setMergeTo] = useState("");
  const [merging, setMerging] = useState(false);
  const [mergeMessage, setMergeMessage] = useState<string | null>(null);

  const loadStateCounts = useCallback(async () => {
    const res = await fetch("/api/admin/leads/states");
    if (res.ok) {
      const data = await res.json();
      setStateCounts(data.states);
      setDeleteStateValue((prev) => prev || data.states[0]?.state || "");
    }
  }, []);

  useEffect(() => {
    loadStateCounts();
  }, [loadStateCounts]);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), archived: archivedFilter });
      if (stateFilter) params.set("state", stateFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (leadTypeFilter) params.set("leadType", leadTypeFilter);
      const res = await fetch(`/api/admin/leads?${params.toString()}`);
      const data = await res.json();
      setLeads(data.leads);
      setTotal(data.total);
      setSelected(new Set());
    } finally {
      setLoading(false);
    }
  }, [page, stateFilter, statusFilter, leadTypeFilter, archivedFilter]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

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

  async function deleteSelected() {
    if (selected.size === 0) return;
    if (!window.confirm(`Permanently delete ${selected.size} selected lead(s)? This can't be undone.`)) return;

    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/admin/leads", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selected] }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setMessage(`Deleted ${data.deleted} lead(s).`);
      setPage(1);
      loadLeads();
      loadStateCounts();
    } else {
      setMessage(data.error ?? "Delete failed");
    }
  }

  async function deleteByState() {
    if (!deleteStateValue) return;
    const count = stateCounts.find((s) => s.state === deleteStateValue)?.count ?? 0;
    const confirmed = window.confirm(
      `Permanently delete ALL ${count.toLocaleString()} lead(s) with state "${deleteStateValue}"? This can't be undone.`,
    );
    if (!confirmed) return;

    setDeleting(true);
    setMessage(null);
    const res = await fetch("/api/admin/leads", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: deleteStateValue }),
    });
    const data = await res.json();
    setDeleting(false);
    if (res.ok) {
      setMessage(`Deleted ${data.deleted} lead(s) with state "${deleteStateValue}".`);
      setPage(1);
      loadLeads();
      loadStateCounts();
    } else {
      setMessage(data.error ?? "Delete failed");
    }
  }

  function toggleMergeFrom(state: string) {
    const next = new Set(mergeFrom);
    if (next.has(state)) next.delete(state);
    else next.add(state);
    setMergeFrom(next);
  }

  async function mergeStates() {
    if (mergeFrom.size === 0 || !mergeTo) return;
    const totalCount = [...mergeFrom].reduce(
      (sum, s) => sum + (stateCounts.find((sc) => sc.state === s)?.count ?? 0),
      0,
    );
    const confirmed = window.confirm(
      `Change ${totalCount.toLocaleString()} lead(s) currently stored as ${[...mergeFrom].join(", ")} to "${mergeTo}"?`,
    );
    if (!confirmed) return;

    setMerging(true);
    setMergeMessage(null);
    const res = await fetch("/api/admin/leads/merge-states", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from: [...mergeFrom], to: mergeTo }),
    });
    const data = await res.json();
    setMerging(false);
    if (res.ok) {
      setMergeMessage(`Merged ${data.updated.toLocaleString()} lead(s) into "${mergeTo}".`);
      setMergeFrom(new Set());
      loadStateCounts();
      loadLeads();
    } else {
      setMergeMessage(data.error ?? "Merge failed");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-48">
            <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
              State
            </label>
            <Select
              value={stateFilter}
              onChange={(e) => {
                setStateFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All States</option>
              {stateCounts.map((s) => (
                <option key={s.state} value={s.state}>
                  {s.state} ({s.count.toLocaleString()})
                </option>
              ))}
            </Select>
          </div>
          <div className="w-52">
            <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
              Status
            </label>
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Statuses</option>
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {LEAD_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-56">
            <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
              Lead Type
            </label>
            <Select
              value={leadTypeFilter}
              onChange={(e) => {
                setLeadTypeFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Types</option>
              {LEAD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {LEAD_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-44">
            <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
              Archived
            </label>
            <Select
              value={archivedFilter}
              onChange={(e) => {
                setArchivedFilter(e.target.value as "any" | "true" | "false");
                setPage(1);
              }}
            >
              <option value="any">All Leads</option>
              <option value="false">Active Only</option>
              <option value="true">Archived Only</option>
            </Select>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{total.toLocaleString()} Lead(s)</CardTitle>
          <Button variant="danger" onClick={deleteSelected} disabled={selected.size === 0 || loading}>
            Delete Selected ({selected.size})
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
                <th className="py-2 pr-4">State</th>
                <th className="py-2 pr-4">DOB</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Agent</th>
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
                  <td className="py-2 pr-4 text-muted">{lead.state}</td>
                  <td className="py-2 pr-4 text-muted">{format(new Date(lead.dateOfBirth), "MM/dd/yyyy")}</td>
                  <td className="py-2 pr-4 text-muted">{LEAD_TYPE_LABELS[lead.leadType]}</td>
                  <td className="py-2 pr-4">
                    <StatusBadge status={lead.status} />
                  </td>
                  <td className="py-2 pr-4 text-muted">{lead.assignedAgent?.name ?? "Unassigned"}</td>
                </tr>
              ))}
              {leads.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="py-4 text-muted">
                    No leads match these filters.
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

      <Card>
        <CardHeader>
          <CardTitle>Delete Leads by State</CardTitle>
        </CardHeader>
        <p className="mb-3 text-sm text-muted">
          Permanently removes every lead currently stored with the exact state value you pick — useful for
          clearing out a bad batch entirely.
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-56">
            <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
              State value
            </label>
            <Select value={deleteStateValue} onChange={(e) => setDeleteStateValue(e.target.value)}>
              {stateCounts.map((s) => (
                <option key={s.state} value={s.state}>
                  {s.state} ({s.count.toLocaleString()})
                </option>
              ))}
            </Select>
          </div>
          <Button variant="danger" onClick={deleteByState} disabled={deleting || !deleteStateValue}>
            Delete All in &quot;{deleteStateValue}&quot;
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Merge Duplicate State Values</CardTitle>
        </CardHeader>
        <p className="mb-3 text-sm text-muted">
          If leads got imported with inconsistent state values (e.g. some rows say &quot;FL&quot;, others say
          &quot;Florida&quot; or &quot;fl&quot;), check the ones you want combined below, pick the correct
          two-letter code to merge them into, and merge. This changes the stored state on every matching lead —
          it does not delete anything.
        </p>

        {mergeMessage && <p className="mb-3 text-sm text-teal-light">{mergeMessage}</p>}

        <div className="mb-4 grid max-h-56 grid-cols-2 gap-1.5 overflow-y-auto rounded-lg border border-border bg-surface p-3 sm:grid-cols-3">
          {stateCounts.map((s) => (
            <label key={s.state} className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={mergeFrom.has(s.state)} onChange={() => toggleMergeFrom(s.state)} />
              {s.state} ({s.count.toLocaleString()})
            </label>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div className="w-56">
            <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
              Merge into
            </label>
            <Select value={mergeTo} onChange={(e) => setMergeTo(e.target.value)}>
              <option value="">Select target state...</option>
              {US_STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.code} — {s.name}
                </option>
              ))}
            </Select>
          </div>
          <Button onClick={mergeStates} disabled={merging || mergeFrom.size === 0 || !mergeTo}>
            Merge {mergeFrom.size > 0 ? `${mergeFrom.size} value(s)` : ""} Into {mergeTo || "..."}
          </Button>
        </div>
      </Card>
    </div>
  );
}
