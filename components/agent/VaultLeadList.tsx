"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LeadStatus } from "@/lib/leadStatus";
import { LEAD_TYPE_LABELS, LeadType } from "@/lib/leadType";
import { formatPhone } from "@/lib/formatPhone";

type Lead = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  state: string;
  dateOfBirth: string;
  status: LeadStatus;
  leadType: LeadType;
};

type StateCount = { state: string; count: number };

export function VaultLeadList() {
  const [stateFilter, setStateFilter] = useState("");
  const [stateCounts, setStateCounts] = useState<StateCount[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/agent/vault/states")
      .then((r) => r.json())
      .then((data) => setStateCounts(data.states));
  }, []);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (stateFilter) params.set("state", stateFilter);
      const res = await fetch(`/api/agent/vault?${params.toString()}`);
      const data = await res.json();
      setLeads(data.leads);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [page, stateFilter]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const filterQuery = stateFilter ? new URLSearchParams({ state: stateFilter }).toString() : "";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="w-56">
          <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
            Filter by State
          </label>
          <Select
            value={stateFilter}
            onChange={(e) => {
              setStateFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All States ({total.toLocaleString()})</option>
            {stateCounts.map((s) => (
              <option key={s.state} value={s.state}>
                {s.state} ({s.count.toLocaleString()})
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-[10px] border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="font-condensed border-b border-border text-[11px] font-bold tracking-[0.1em] text-muted uppercase">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">State</th>
              <th className="px-4 py-3">DOB</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {!loading && leads.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted">
                  No vault leads match this filter.
                </td>
              </tr>
            )}
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b border-border/60 hover:bg-surface2">
                <td className="px-4 py-3">
                  <Link href={`/agent/vault/${lead.id}?${filterQuery}`} className="text-white hover:text-copper">
                    {lead.firstName} {lead.lastName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">{formatPhone(lead.phone)}</td>
                <td className="px-4 py-3 text-muted">{lead.state}</td>
                <td className="px-4 py-3 text-muted">{format(new Date(lead.dateOfBirth), "MM/dd/yyyy")}</td>
                <td className="px-4 py-3 text-muted">{LEAD_TYPE_LABELS[lead.leadType]}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={lead.status} />
                </td>
              </tr>
            ))}
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
    </div>
  );
}
