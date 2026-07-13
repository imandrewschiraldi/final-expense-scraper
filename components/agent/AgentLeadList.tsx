"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import { LEAD_STATUS_LABELS, LeadStatus } from "@/lib/leadStatus";
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

const LEAD_TYPE_SHORT_LABELS: Record<LeadType, string> = {
  VETERANS_FINAL_EXPENSE: "VFE",
  MORTGAGE_PROTECTION: "MP",
};

const ACTIVE_TABS: { value: LeadStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All Active" },
  { value: "NEW", label: LEAD_STATUS_LABELS.NEW },
  { value: "CONTACTED", label: LEAD_STATUS_LABELS.CONTACTED },
  { value: "NO_ANSWER", label: LEAD_STATUS_LABELS.NO_ANSWER },
  { value: "APPOINTMENT_BOOKING", label: LEAD_STATUS_LABELS.APPOINTMENT_BOOKING },
];

function buildFilterParams(tab: LeadStatus | "ALL", archiveView: boolean, state: string) {
  const params = new URLSearchParams();
  if (archiveView) {
    params.set("archived", "true");
  } else if (tab !== "ALL") {
    params.set("status", tab);
  }
  if (state) {
    params.set("state", state);
  }
  return params;
}

export function AgentLeadList({ initialLeads }: { initialLeads: Lead[] }) {
  const [tab, setTab] = useState<LeadStatus | "ALL">("ALL");
  const [archiveView, setArchiveView] = useState(false);
  const [stateFilter, setStateFilter] = useState("");
  const [stateOptions, setStateOptions] = useState<{ state: string; count: number }[]>([]);
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [loading, setLoading] = useState(false);

  const filterParams = buildFilterParams(tab, archiveView, stateFilter);
  const filterQuery = filterParams.toString();

  useEffect(() => {
    async function loadStates() {
      const res = await fetch("/api/agent/leads/states");
      if (res.ok) {
        const data = await res.json();
        setStateOptions(data.states);
      }
    }

    loadStates();
  }, []);

  useEffect(() => {
    async function loadLeads() {
      setLoading(true);
      try {
        const res = await fetch(`/api/agent/leads?${filterQuery}`);
        const data = await res.json();
        setLeads(data.leads);
      } finally {
        setLoading(false);
      }
    }

    loadLeads();
  }, [filterQuery]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {ACTIVE_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => {
                setArchiveView(false);
                setTab(t.value);
              }}
              className={cn(
                "font-condensed rounded-lg border-[1.5px] px-4 py-2 text-[13px] font-bold tracking-[0.05em] uppercase transition-colors",
                !archiveView && tab === t.value
                  ? "border-copper bg-copper text-black"
                  : "border-copper-dim text-muted hover:border-copper hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="w-40"
          >
            <option value="">All States</option>
            {stateOptions.map((s) => (
              <option key={s.state} value={s.state}>
                {s.state} ({s.count.toLocaleString()})
              </option>
            ))}
          </Select>
          <a href={`/api/agent/leads/export?${filterQuery}`}>
            <Button variant="secondary">Export CSV</Button>
          </a>
          <button
            onClick={() => setArchiveView(true)}
            className={cn(
              "font-condensed rounded-lg border-[1.5px] px-4 py-2 text-[13px] font-bold tracking-[0.05em] uppercase transition-colors",
              archiveView ? "border-copper bg-copper text-black" : "border-border text-muted hover:border-copper hover:text-foreground",
            )}
          >
            Archive
          </button>
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
                  No leads here.
                </td>
              </tr>
            )}
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b border-border/60 hover:bg-surface2">
                <td className="px-4 py-3">
                  <Link href={`/agent/leads/${lead.id}?${filterQuery}`} className="text-white hover:text-copper">
                    {lead.firstName} {lead.lastName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">{formatPhone(lead.phone)}</td>
                <td className="px-4 py-3 text-muted">{lead.state}</td>
                <td className="px-4 py-3 text-muted">{format(new Date(lead.dateOfBirth), "MM/dd/yyyy")}</td>
                <td className="px-4 py-3 text-muted" title={LEAD_TYPE_LABELS[lead.leadType]}>
                  {LEAD_TYPE_SHORT_LABELS[lead.leadType]}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={lead.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
