"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { format } from "date-fns";
import { formatPhone } from "@/lib/formatPhone";
import { LEAD_TYPE_LABELS, LeadType } from "@/lib/leadType";

type Lead = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  state: string;
  dateOfBirth: string;
  leadType: LeadType;
  assignedAgent: { id: string; name: string } | null;
};

export function VaultAdminPanel() {
  const [vaultTotal, setVaultTotal] = useState<number | null>(null);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadVaultTotal = useCallback(async () => {
    const res = await fetch("/api/admin/leads?isVaulted=true&archived=any&page=1");
    if (res.ok) {
      const data = await res.json();
      setVaultTotal(data.total);
    }
  }, []);

  const loadNotInterested = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: "NOT_INTERESTED",
        vaultOrigin: "true",
        archived: "any",
        page: String(page),
      });
      const res = await fetch(`/api/admin/leads?${params.toString()}`);
      const data = await res.json();
      setLeads(data.leads);
      setTotal(data.total);
      setSelected(new Set());
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadVaultTotal();
  }, [loadVaultTotal]);

  useEffect(() => {
    loadNotInterested();
  }, [loadNotInterested]);

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

  function refreshAll() {
    setPage(1);
    loadNotInterested();
    loadVaultTotal();
  }

  async function deleteSelected() {
    if (selected.size === 0) return;
    if (!window.confirm(`Permanently delete ${selected.size} selected lead(s)? This can't be undone.`)) return;
    setLoading(true);
    const res = await fetch("/api/admin/leads", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selected] }),
    });
    const data = await res.json();
    setLoading(false);
    setMessage(res.ok ? `Deleted ${data.deleted} lead(s).` : (data.error ?? "Delete failed"));
    if (res.ok) refreshAll();
  }

  async function resetSelected() {
    if (selected.size === 0) return;
    if (!window.confirm(`Send ${selected.size} selected lead(s) back into the vault as New?`)) return;
    setLoading(true);
    const res = await fetch("/api/admin/leads/vault-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selected] }),
    });
    const data = await res.json();
    setLoading(false);
    setMessage(res.ok ? `Reset ${data.reset} lead(s) back into the vault.` : (data.error ?? "Reset failed"));
    if (res.ok) refreshAll();
  }

  async function deleteAll() {
    if (total === 0) return;
    if (!window.confirm(`Permanently delete ALL ${total.toLocaleString()} Not Interested vault lead(s)? This can't be undone.`)) return;
    setLoading(true);
    const res = await fetch("/api/admin/leads", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "NOT_INTERESTED", vaultOrigin: true }),
    });
    const data = await res.json();
    setLoading(false);
    setMessage(res.ok ? `Deleted ${data.deleted} lead(s).` : (data.error ?? "Delete failed"));
    if (res.ok) refreshAll();
  }

  async function resetAll() {
    if (total === 0) return;
    if (!window.confirm(`Send ALL ${total.toLocaleString()} Not Interested vault lead(s) back into the vault as New?`)) return;
    setLoading(true);
    const res = await fetch("/api/admin/leads/vault-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "NOT_INTERESTED", vaultOrigin: true }),
    });
    const data = await res.json();
    setLoading(false);
    setMessage(res.ok ? `Reset ${data.reset} lead(s) back into the vault.` : (data.error ?? "Reset failed"));
    if (res.ok) refreshAll();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Vault Instructions</CardTitle>
        </CardHeader>
        <div className="space-y-3 text-sm text-muted">
          <p>
            The Vault is a shared lead source, open to every agent for their first eight (8) weeks. All agents
            draw from the same vault and are expected to work it accordingly.
          </p>
          <p>
            <span className="font-bold text-white">Every lead must be dispositioned when dialed.</span> A
            disposition is not optional — it is the price to access this vault.
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Leads marked <span className="font-semibold text-green-light">Sold</span> or{" "}
              <span className="font-semibold text-red-light">Not Interested</span> are removed from the vault
              immediately.</li>
            <li>Leads marked <span className="font-semibold text-white">Appointment Booked</span> that are not
              marked Sold within 14 days are automatically returned to the vault.</li>
          </ul>
          <p className="font-semibold text-white">
            This is a privilege, not a right. Any agent found contacting leads without dispositioning them
            will have their Vault access revoked.
          </p>
          <p className="border-t border-border pt-3">
            <span className="text-2xl font-extrabold text-copper">{vaultTotal?.toLocaleString() ?? "…"}</span>{" "}
            lead(s) currently sitting in the shared vault.
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Not Interested ({total.toLocaleString()})</CardTitle>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={resetAll} disabled={loading || total === 0}>
              Reset All to Vault
            </Button>
            <Button variant="danger" onClick={deleteAll} disabled={loading || total === 0}>
              Delete All
            </Button>
          </div>
        </CardHeader>
        <p className="mb-3 text-sm text-muted">
          Leads that came from the vault and were marked Not Interested. These don&apos;t return to the vault
          automatically — review them here and either delete them for good or send them back in.
        </p>

        {message && <p className="mb-3 text-sm text-teal-light">{message}</p>}

        <div className="mb-3 flex gap-2">
          <Button variant="secondary" onClick={resetSelected} disabled={selected.size === 0 || loading}>
            Reset Selected ({selected.size})
          </Button>
          <Button variant="danger" onClick={deleteSelected} disabled={selected.size === 0 || loading}>
            Delete Selected ({selected.size})
          </Button>
        </div>

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
                <th className="py-2 pr-4">Claimed By</th>
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
                  <td className="py-2 pr-4 text-muted">{lead.assignedAgent?.name ?? "—"}</td>
                </tr>
              ))}
              {leads.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="py-4 text-muted">
                    No Not Interested leads from the vault right now.
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
