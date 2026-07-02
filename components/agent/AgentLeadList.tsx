"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/cn";
import { LEAD_STATUS_LABELS, LeadStatus } from "@/lib/leadStatus";

type Lead = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  state: string;
  dateOfBirth: string;
  status: LeadStatus;
};

const ACTIVE_TABS: { value: LeadStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All Active" },
  { value: "NEW", label: LEAD_STATUS_LABELS.NEW },
  { value: "CONTACTED", label: LEAD_STATUS_LABELS.CONTACTED },
  { value: "NO_ANSWER", label: LEAD_STATUS_LABELS.NO_ANSWER },
  { value: "APPOINTMENT_BOOKING", label: LEAD_STATUS_LABELS.APPOINTMENT_BOOKING },
];

export function AgentLeadList({ initialLeads }: { initialLeads: Lead[] }) {
  const [tab, setTab] = useState<LeadStatus | "ALL">("ALL");
  const [archiveView, setArchiveView] = useState(false);
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadLeads() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (archiveView) {
          params.set("archived", "true");
        } else if (tab !== "ALL") {
          params.set("status", tab);
        }
        const res = await fetch(`/api/agent/leads?${params.toString()}`);
        const data = await res.json();
        setLeads(data.leads);
      } finally {
        setLoading(false);
      }
    }

    loadLeads();
  }, [tab, archiveView]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {ACTIVE_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => {
                setArchiveView(false);
                setTab(t.value);
              }}
              className={cn(
                "rounded-md px-3 py-2 text-sm uppercase tracking-wide transition-colors",
                !archiveView && tab === t.value
                  ? "bg-copper/10 text-copper-light"
                  : "text-muted hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setArchiveView(true)}
          className={cn(
            "rounded-md px-3 py-2 text-sm uppercase tracking-wide transition-colors",
            archiveView ? "bg-gold/10 text-gold" : "text-muted hover:text-foreground",
          )}
        >
          Archive
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">State</th>
              <th className="px-4 py-3">DOB</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {!loading && leads.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted">
                  No leads here.
                </td>
              </tr>
            )}
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b border-border/60 hover:bg-surface-raised">
                <td className="px-4 py-3">
                  <Link href={`/agent/leads/${lead.id}`} className="text-foreground hover:text-copper-light">
                    {lead.firstName} {lead.lastName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">{lead.phone}</td>
                <td className="px-4 py-3 text-muted">{lead.state}</td>
                <td className="px-4 py-3 text-muted">{format(new Date(lead.dateOfBirth), "MM/dd/yyyy")}</td>
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
