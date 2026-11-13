"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StatCard } from "@/components/admin/StatCard";
import { formatPhone } from "@/lib/formatPhone";
import { formatDob } from "@/lib/formatDob";
import { LEAD_TYPE_LABELS, LEAD_TYPES, LeadType } from "@/lib/leadType";
import {
  LEAD_STATUS_LABELS,
  LEAD_STATUSES,
  LeadStatus,
} from "@/lib/leadStatus";
import { US_STATES } from "@/lib/usStates";

type Lead = {
  id: string;
  leadNumber: string | null;
  firstName: string;
  lastName: string;
  phone: string;
  state: string;
  dateOfBirth: string | null;
  leadType: LeadType;
  status: LeadStatus;
  isArchived: boolean;
  isVaulted: boolean;
  assignedAgent: { id: string; name: string } | null;
};

type StateCount = { state: string; count: number };
type AgentOption = {
  id: string;
  name: string;
  _count: { assignedLeads: number };
};

export function AllLeadsPanel() {
  const [stateFilters, setStateFilters] = useState<Set<string>>(new Set());
  const [stateFilterOpen, setStateFilterOpen] = useState(false);
  const [stateFilterSearch, setStateFilterSearch] = useState("");
  const stateFilterRef = useRef<HTMLDivElement>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [leadTypeFilter, setLeadTypeFilter] = useState("");
  const [archivedFilter, setArchivedFilter] = useState<
    "any" | "true" | "false"
  >("any");
  const [vaultFilter, setVaultFilter] = useState<"any" | "true" | "false">(
    "any",
  );
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [previouslyAssignedOnly, setPreviouslyAssignedOnly] = useState(false);
  const [moving, setMoving] = useState(false);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [stateCounts, setStateCounts] = useState<StateCount[]>([]);
  const [deleteStateValue, setDeleteStateValue] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [vaultStateCounts, setVaultStateCounts] = useState<StateCount[]>([]);
  const [unvaultStateValue, setUnvaultStateValue] = useState("");
  const [unvaulting, setUnvaulting] = useState(false);
  const [unvaultMessage, setUnvaultMessage] = useState<string | null>(null);

  const [unvaultPhonesText, setUnvaultPhonesText] = useState("");
  const [unvaultingPhones, setUnvaultingPhones] = useState(false);
  const [unvaultPhonesMessage, setUnvaultPhonesMessage] = useState<
    string | null
  >(null);

  const [backfillingLeadNumbers, setBackfillingLeadNumbers] = useState(false);
  const [backfillLeadNumbersMessage, setBackfillLeadNumbersMessage] = useState<
    string | null
  >(null);

  const [agentsWithLeads, setAgentsWithLeads] = useState<AgentOption[]>([]);
  const [unassignAgentId, setUnassignAgentId] = useState("");
  const [unassigningAgent, setUnassigningAgent] = useState(false);
  const [unassignAgentMessage, setUnassignAgentMessage] = useState<
    string | null
  >(null);

  const loadAgentsWithLeads = useCallback(async () => {
    const res = await fetch("/api/admin/agents");
    if (res.ok) {
      const data = await res.json();
      const withLeads = (data.agents as AgentOption[])
        .filter((a) => a._count.assignedLeads > 0)
        .sort((a, b) => a.name.localeCompare(b.name));
      setAgentsWithLeads(withLeads);
      setUnassignAgentId((prev) => prev || withLeads[0]?.id || "");
    }
  }, []);

  useEffect(() => {
    loadAgentsWithLeads();
  }, [loadAgentsWithLeads]);

  const loadVaultStateCounts = useCallback(async () => {
    const res = await fetch("/api/admin/leads/states?isVaulted=true");
    if (res.ok) {
      const data = await res.json();
      setVaultStateCounts(data.states);
      setUnvaultStateValue((prev) => prev || data.states[0]?.state || "");
    }
  }, []);

  useEffect(() => {
    loadVaultStateCounts();
  }, [loadVaultStateCounts]);

  const [unassignedTotal, setUnassignedTotal] = useState(0);
  const [assignedTotal, setAssignedTotal] = useState(0);
  const [vaultTotal, setVaultTotal] = useState(0);

  const loadAssignmentSummary = useCallback(async () => {
    // Unassigned/Assigned counts exclude vault leads — the vault is tracked
    // separately since it isn't "owned" by anyone until an agent claims it.
    const [unassignedRes, nonVaultRes, vaultRes] = await Promise.all([
      fetch(
        "/api/admin/leads?archived=any&unassignedOnly=true&isVaulted=false&page=1",
      ),
      fetch("/api/admin/leads?archived=any&isVaulted=false&page=1"),
      fetch("/api/admin/leads?archived=any&isVaulted=true&page=1"),
    ]);
    const [unassignedData, nonVaultData, vaultData] = await Promise.all([
      unassignedRes.json(),
      nonVaultRes.json(),
      vaultRes.json(),
    ]);
    setUnassignedTotal(unassignedData.total);
    setAssignedTotal(nonVaultData.total - unassignedData.total);
    setVaultTotal(vaultData.total);
  }, []);

  useEffect(() => {
    loadAssignmentSummary();
  }, [loadAssignmentSummary]);

  const [mergeFrom, setMergeFrom] = useState<Set<string>>(new Set());
  const [mergeTo, setMergeTo] = useState("");
  const [merging, setMerging] = useState(false);
  const [mergeMessage, setMergeMessage] = useState<string | null>(null);
  const [mergeSearch, setMergeSearch] = useState("");

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

  useEffect(() => {
    if (!stateFilterOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        stateFilterRef.current &&
        !stateFilterRef.current.contains(e.target as Node)
      ) {
        setStateFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [stateFilterOpen]);

  function toggleStateFilter(state: string) {
    const next = new Set(stateFilters);
    if (next.has(state)) next.delete(state);
    else next.add(state);
    setStateFilters(next);
    setPage(1);
  }

  const filteredStateOptions = stateFilterSearch.trim()
    ? stateCounts.filter((s) =>
        s.state.toLowerCase().includes(stateFilterSearch.trim().toLowerCase()),
      )
    : stateCounts;

  const buildFilterParams = useCallback(
    (extra?: Record<string, string>) => {
      const params = new URLSearchParams({
        archived: archivedFilter,
        ...extra,
      });
      if (stateFilters.size > 0)
        params.set("states", [...stateFilters].join(","));
      if (statusFilter) params.set("status", statusFilter);
      if (leadTypeFilter) params.set("leadType", leadTypeFilter);
      if (vaultFilter !== "any") params.set("isVaulted", vaultFilter);
      if (unassignedOnly) params.set("unassignedOnly", "true");
      if (previouslyAssignedOnly) params.set("wasRecycled", "true");
      return params;
    },
    [
      stateFilters,
      statusFilter,
      leadTypeFilter,
      archivedFilter,
      vaultFilter,
      unassignedOnly,
      previouslyAssignedOnly,
    ],
  );

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildFilterParams({ page: String(page) });
      const res = await fetch(`/api/admin/leads?${params.toString()}`);
      const data = await res.json();
      setLeads(data.leads);
      setTotal(data.total);
      setSelected(new Set());
    } finally {
      setLoading(false);
    }
  }, [page, buildFilterParams]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const [selectingAll, setSelectingAll] = useState(false);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function selectAllMatchingFilters() {
    setSelectingAll(true);
    try {
      const params = buildFilterParams({ idsOnly: "true" });
      const res = await fetch(`/api/admin/leads?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSelected(new Set(data.ids));
      }
    } finally {
      setSelectingAll(false);
    }
  }

  const allOnPageSelected =
    leads.length > 0 && leads.every((l) => selected.has(l.id));

  function toggleAllOnPage() {
    if (allOnPageSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(leads.map((l) => l.id)));
    }
  }

  async function deleteSelected() {
    if (selected.size === 0) return;
    if (
      !window.confirm(
        `Permanently delete ${selected.size} selected lead(s)? This can't be undone.`,
      )
    )
      return;

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
      loadAssignmentSummary();
    } else {
      setMessage(data.error ?? "Delete failed");
    }
  }

  async function deleteByState() {
    if (!deleteStateValue) return;
    const count =
      stateCounts.find((s) => s.state === deleteStateValue)?.count ?? 0;
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
      setMessage(
        `Deleted ${data.deleted} lead(s) with state "${deleteStateValue}".`,
      );
      setPage(1);
      loadLeads();
      loadStateCounts();
      loadAssignmentSummary();
    } else {
      setMessage(data.error ?? "Delete failed");
    }
  }

  async function moveSelectedToVault() {
    if (selected.size === 0) return;
    if (
      !window.confirm(
        `Move ${selected.size} selected lead(s) into the shared Vault pool?`,
      )
    )
      return;

    setMoving(true);
    setMessage(null);
    const res = await fetch("/api/admin/leads/move-to-vault", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selected] }),
    });
    const data = await res.json();
    setMoving(false);
    if (res.ok) {
      setMessage(`Moved ${data.moved} lead(s) into the vault.`);
      loadLeads();
      loadAssignmentSummary();
      loadVaultStateCounts();
    } else {
      setMessage(data.error ?? "Move failed");
    }
  }

  async function removeFromVaultByState() {
    if (!unvaultStateValue) return;
    const count =
      vaultStateCounts.find((s) => s.state === unvaultStateValue)?.count ?? 0;
    const confirmed = window.confirm(
      `Remove ALL ${count.toLocaleString()} lead(s) with state "${unvaultStateValue}" from the Vault and return them to the unassigned pool?`,
    );
    if (!confirmed) return;

    setUnvaulting(true);
    setUnvaultMessage(null);
    const res = await fetch("/api/admin/leads/remove-from-vault", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: unvaultStateValue }),
    });
    const data = await res.json();
    setUnvaulting(false);
    if (res.ok) {
      setUnvaultMessage(
        `Removed ${data.removed.toLocaleString()} lead(s) with state "${unvaultStateValue}" from the vault.`,
      );
      setPage(1);
      loadLeads();
      loadAssignmentSummary();
      loadVaultStateCounts();
    } else {
      setUnvaultMessage(data.error ?? "Remove from vault failed");
    }
  }

  // Pulled out of the pasted blob with a standard NANP phone pattern so the
  // admin can paste raw CSV rows (name, phone, dob, state, notes...) as-is —
  // dates and notes don't form a matching 10-digit run.
  function extractPhones(text: string): string[] {
    const matches =
      text.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g) ?? [];
    return [...new Set(matches)];
  }

  async function removeFromVaultByPhoneList() {
    const phones = extractPhones(unvaultPhonesText);
    if (phones.length === 0) {
      setUnvaultPhonesMessage("No phone numbers found in the pasted text.");
      return;
    }
    const confirmed = window.confirm(
      `Found ${phones.length.toLocaleString()} phone number(s) in the pasted text. Remove any matching Vault leads and return them to the unassigned pool?`,
    );
    if (!confirmed) return;

    setUnvaultingPhones(true);
    setUnvaultPhonesMessage(null);
    const res = await fetch("/api/admin/leads/remove-from-vault", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phones }),
    });
    const data = await res.json();
    setUnvaultingPhones(false);
    if (res.ok) {
      setUnvaultPhonesMessage(
        `Matched ${data.matched?.toLocaleString() ?? phones.length} lead(s) in the vault and removed ${data.removed.toLocaleString()} of them to the unassigned pool.`,
      );
      setUnvaultPhonesText("");
      setPage(1);
      loadLeads();
      loadAssignmentSummary();
      loadVaultStateCounts();
    } else {
      setUnvaultPhonesMessage(data.error ?? "Remove from vault failed");
    }
  }

  async function backfillLeadNumbers() {
    const confirmed = window.confirm(
      "Assign a lead number to every lead that doesn't have one yet, and give each a random date added sometime in the last 9-12 months? " +
        "This overwrites those leads' \"date added\" — it can't be undone. Leads that already have a lead number are left untouched.",
    );
    if (!confirmed) return;

    setBackfillingLeadNumbers(true);
    setBackfillLeadNumbersMessage(null);
    const res = await fetch("/api/admin/leads/backfill-lead-numbers", {
      method: "POST",
    });
    const data = await res.json();
    setBackfillingLeadNumbers(false);
    if (res.ok) {
      setBackfillLeadNumbersMessage(
        `Assigned lead numbers to ${data.updated.toLocaleString()} lead(s).`,
      );
      setPage(1);
      loadLeads();
    } else {
      setBackfillLeadNumbersMessage(data.error ?? "Backfill failed");
    }
  }

  async function unassignAgentLeads() {
    if (!unassignAgentId) return;
    const agent = agentsWithLeads.find((a) => a.id === unassignAgentId);
    const count = agent?._count.assignedLeads ?? 0;
    const confirmed = window.confirm(
      `Unassign all ${count.toLocaleString()} lead(s) currently assigned to ${agent?.name ?? "this agent"}? ` +
        `They're returned to the unassigned pool (not the vault) and stay visible under "Previously Assigned Only".`,
    );
    if (!confirmed) return;

    setUnassigningAgent(true);
    setUnassignAgentMessage(null);
    const res = await fetch("/api/admin/leads/unassign-agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: unassignAgentId }),
    });
    const data = await res.json();
    setUnassigningAgent(false);
    if (res.ok) {
      setUnassignAgentMessage(
        `Unassigned ${data.unassigned.toLocaleString()} lead(s) from ${agent?.name ?? "this agent"}.`,
      );
      setUnassignAgentId("");
      setPage(1);
      loadLeads();
      loadAssignmentSummary();
      loadAgentsWithLeads();
    } else {
      setUnassignAgentMessage(data.error ?? "Unassign failed");
    }
  }

  function toggleMergeFrom(state: string) {
    const next = new Set(mergeFrom);
    if (next.has(state)) next.delete(state);
    else next.add(state);
    setMergeFrom(next);
  }

  const filteredMergeStates = mergeSearch.trim()
    ? stateCounts.filter((s) =>
        s.state.toLowerCase().includes(mergeSearch.trim().toLowerCase()),
      )
    : stateCounts;

  const allShownSelected =
    filteredMergeStates.length > 0 &&
    filteredMergeStates.every((s) => mergeFrom.has(s.state));

  function toggleAllShown() {
    const next = new Set(mergeFrom);
    if (allShownSelected) {
      filteredMergeStates.forEach((s) => next.delete(s.state));
    } else {
      filteredMergeStates.forEach((s) => next.add(s.state));
    }
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
      setMergeMessage(
        `Merged ${data.updated.toLocaleString()} lead(s) into "${mergeTo}".`,
      );
      setMergeFrom(new Set());
      loadStateCounts();
      loadLeads();
    } else {
      setMergeMessage(data.error ?? "Merge failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Unassigned Leads"
          value={unassignedTotal}
          accent="copper"
        />
        <StatCard label="Assigned Leads" value={assignedTotal} accent="teal" />
        <StatCard label="Vault Leads" value={vaultTotal} accent="copper" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <div className="flex flex-wrap items-end gap-4">
          <div className="relative w-56" ref={stateFilterRef}>
            <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
              State
            </label>
            <button
              type="button"
              onClick={() => setStateFilterOpen((o) => !o)}
              className="flex w-full items-center justify-between rounded-md border border-border bg-black/20 px-3 py-2 text-left text-sm text-white"
            >
              <span>
                {stateFilters.size === 0
                  ? "All States"
                  : stateFilters.size === 1
                    ? [...stateFilters][0]
                    : `${stateFilters.size} states selected`}
              </span>
              <span className="text-muted">▾</span>
            </button>
            {stateFilterOpen && (
              <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-surface p-2 shadow-lg">
                <Input
                  value={stateFilterSearch}
                  onChange={(e) => setStateFilterSearch(e.target.value)}
                  placeholder="Search states..."
                  className="mb-2"
                />
                <div className="mb-2 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    className="text-xs text-muted hover:text-foreground"
                    onClick={() => {
                      setStateFilters(new Set());
                      setPage(1);
                    }}
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    className="text-xs text-muted hover:text-foreground"
                    onClick={() => {
                      setStateFilters(
                        new Set(filteredStateOptions.map((s) => s.state)),
                      );
                      setPage(1);
                    }}
                  >
                    Select All Shown
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {filteredStateOptions.map((s) => (
                    <label
                      key={s.state}
                      className="flex items-center gap-2 rounded px-1 py-1 text-sm text-muted hover:bg-black/20"
                    >
                      <input
                        type="checkbox"
                        checked={stateFilters.has(s.state)}
                        onChange={() => toggleStateFilter(s.state)}
                      />
                      {s.state} ({s.count.toLocaleString()})
                    </label>
                  ))}
                  {filteredStateOptions.length === 0 && (
                    <p className="px-1 py-1 text-sm text-muted">
                      No states match &quot;{stateFilterSearch}&quot;.
                    </p>
                  )}
                </div>
              </div>
            )}
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
          <div className="w-44">
            <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
              Vault
            </label>
            <Select
              value={vaultFilter}
              onChange={(e) => {
                setVaultFilter(e.target.value as "any" | "true" | "false");
                setPage(1);
              }}
            >
              <option value="any">Any</option>
              <option value="true">In Vault</option>
              <option value="false">Not in Vault</option>
            </Select>
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={unassignedOnly}
              onChange={(e) => {
                setUnassignedOnly(e.target.checked);
                setPage(1);
              }}
            />
            Unassigned Only
          </label>
          <label className="flex items-center gap-2 pb-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={previouslyAssignedOnly}
              onChange={(e) => {
                setPreviouslyAssignedOnly(e.target.checked);
                setPage(1);
              }}
            />
            Previously Assigned Only
          </label>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{total.toLocaleString()} Lead(s)</CardTitle>
          <div className="flex flex-wrap gap-2">
            <a
              href={`/api/admin/leads/export?${buildFilterParams().toString()}`}
            >
              <Button variant="secondary" disabled={total === 0}>
                Export CSV ({total.toLocaleString()})
              </Button>
            </a>
            <Button
              variant="ghost"
              onClick={selectAllMatchingFilters}
              disabled={selectingAll || total === 0}
            >
              {selectingAll
                ? "Selecting..."
                : `Select All ${total.toLocaleString()}`}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setSelected(new Set())}
              disabled={selected.size === 0}
            >
              Clear Selection
            </Button>
            <Button
              variant="secondary"
              onClick={moveSelectedToVault}
              disabled={selected.size === 0 || moving}
            >
              Move Selected to Vault ({selected.size.toLocaleString()})
            </Button>
            <Button
              variant="danger"
              onClick={deleteSelected}
              disabled={selected.size === 0 || loading}
            >
              Delete Selected ({selected.size.toLocaleString()})
            </Button>
          </div>
        </CardHeader>

        {message && <p className="mb-3 text-sm text-teal-light">{message}</p>}
        <p className="mb-3 text-xs text-muted">
          &quot;Export CSV&quot; and &quot;Select All&quot; both use every lead
          matching your current filters, not just the 50 shown on this page.
          &quot;Move Selected to Vault&quot; only affects unassigned leads — any
          selected leads already assigned to an agent are skipped.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="font-condensed border-b border-border text-[11px] font-bold tracking-[0.1em] text-muted uppercase">
                <th className="py-2 pr-4">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleAllOnPage}
                  />
                </th>
                <th className="py-2 pr-4">Lead #</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Phone</th>
                <th className="py-2 pr-4">State</th>
                <th className="py-2 pr-4">DOB</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Agent</th>
                <th className="py-2 pr-4">Vault</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="border-b border-border/60 hover:bg-surface2"
                >
                  <td className="py-2 pr-4">
                    <input
                      type="checkbox"
                      checked={selected.has(lead.id)}
                      onChange={() => toggle(lead.id)}
                    />
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs text-muted">
                    {lead.leadNumber ?? "—"}
                  </td>
                  <td className="py-2 pr-4 text-white">
                    {lead.firstName} {lead.lastName}
                  </td>
                  <td className="py-2 pr-4 text-muted">
                    {formatPhone(lead.phone)}
                  </td>
                  <td className="py-2 pr-4 text-muted">{lead.state}</td>
                  <td className="py-2 pr-4 text-muted">
                    {formatDob(lead.dateOfBirth)}
                  </td>
                  <td className="py-2 pr-4 text-muted">
                    {LEAD_TYPE_LABELS[lead.leadType]}
                  </td>
                  <td className="py-2 pr-4">
                    <StatusBadge status={lead.status} />
                  </td>
                  <td className="py-2 pr-4 text-muted">
                    {lead.assignedAgent?.name ?? "Unassigned"}
                  </td>
                  <td className="py-2 pr-4 text-muted">
                    {lead.isVaulted ? "Yes" : "—"}
                  </td>
                </tr>
              ))}
              {leads.length === 0 && !loading && (
                <tr>
                  <td colSpan={9} className="py-4 text-muted">
                    No leads match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button
            variant="ghost"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted">Page {page}</span>
          <Button
            variant="ghost"
            disabled={leads.length < 50}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assign Lead Numbers</CardTitle>
        </CardHeader>
        <p className="mb-3 text-sm text-muted">
          Gives every lead without one a unique lead number (&quot;VL00&quot; +
          6 digits) and a random &quot;date added&quot; somewhere in the last
          9-12 months. Safe to run more than once — only leads still missing a
          number are touched.
        </p>
        {backfillLeadNumbersMessage && (
          <p className="mb-3 text-sm text-teal-light">
            {backfillLeadNumbersMessage}
          </p>
        )}
        <Button
          variant="secondary"
          onClick={backfillLeadNumbers}
          disabled={backfillingLeadNumbers}
        >
          {backfillingLeadNumbers ? "Assigning..." : "Assign Lead Numbers"}
        </Button>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delete Leads by State</CardTitle>
        </CardHeader>
        <p className="mb-3 text-sm text-muted">
          Permanently removes every lead currently stored with the exact state
          value you pick — useful for clearing out a bad batch entirely.
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-56">
            <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
              State value
            </label>
            <Select
              value={deleteStateValue}
              onChange={(e) => setDeleteStateValue(e.target.value)}
            >
              {stateCounts.map((s) => (
                <option key={s.state} value={s.state}>
                  {s.state} ({s.count.toLocaleString()})
                </option>
              ))}
            </Select>
          </div>
          <Button
            variant="danger"
            onClick={deleteByState}
            disabled={deleting || !deleteStateValue}
          >
            Delete All in &quot;{deleteStateValue}&quot;
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Remove Leads From Vault by State</CardTitle>
        </CardHeader>
        <p className="mb-3 text-sm text-muted">
          Pulls every lead with the state you pick out of the shared Vault and
          drops them back into the regular unassigned pool, where they become
          assignable again. Doesn&apos;t delete anything.
        </p>
        {unvaultMessage && (
          <p className="mb-3 text-sm text-teal-light">{unvaultMessage}</p>
        )}
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-56">
            <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
              State value
            </label>
            <Select
              value={unvaultStateValue}
              onChange={(e) => setUnvaultStateValue(e.target.value)}
            >
              {vaultStateCounts.length === 0 && (
                <option value="">No leads currently in vault</option>
              )}
              {vaultStateCounts.map((s) => (
                <option key={s.state} value={s.state}>
                  {s.state} ({s.count.toLocaleString()})
                </option>
              ))}
            </Select>
          </div>
          <Button
            variant="secondary"
            onClick={removeFromVaultByState}
            disabled={
              unvaulting || !unvaultStateValue || vaultStateCounts.length === 0
            }
          >
            Remove All &quot;{unvaultStateValue}&quot; From Vault
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Remove Leads From Vault by Phone List</CardTitle>
        </CardHeader>
        <p className="mb-3 text-sm text-muted">
          Paste a phone number list — or raw CSV rows, any format — and any
          Vault lead whose phone matches gets pulled out of the Vault and
          returned to the unassigned pool. Doesn&apos;t delete anything, and
          leaves non-matching leads untouched.
        </p>
        {unvaultPhonesMessage && (
          <p className="mb-3 text-sm text-teal-light">{unvaultPhonesMessage}</p>
        )}
        <textarea
          value={unvaultPhonesText}
          onChange={(e) => setUnvaultPhonesText(e.target.value)}
          placeholder={
            "Paste phone numbers or whole CSV rows here, e.g.\nPaul Durboraw,12403130600,12/23/1947,MD,retired\n(503) 828-8884\n..."
          }
          rows={6}
          className="mb-3 w-full rounded-md border border-border bg-black/20 px-3 py-2 text-xs text-white placeholder:text-muted focus:border-primary focus:outline-none"
        />
        <Button
          variant="secondary"
          onClick={removeFromVaultByPhoneList}
          disabled={unvaultingPhones || !unvaultPhonesText.trim()}
        >
          {unvaultingPhones
            ? "Removing..."
            : "Remove Matching Leads From Vault"}
        </Button>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Unassign Agent&apos;s Leads</CardTitle>
        </CardHeader>
        <p className="mb-3 text-sm text-muted">
          Pulls every currently-assigned lead off the agent you pick and returns
          them to the regular unassigned pool — not the vault. They keep their
          status and history, and stay visible in All Leads under
          &quot;Previously Assigned Only&quot; so you can review what they were
          working before reassigning.
        </p>
        {unassignAgentMessage && (
          <p className="mb-3 text-sm text-teal-light">{unassignAgentMessage}</p>
        )}
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-64">
            <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
              Agent
            </label>
            <Select
              value={unassignAgentId}
              onChange={(e) => setUnassignAgentId(e.target.value)}
            >
              {agentsWithLeads.length === 0 && (
                <option value="">
                  No agents currently have assigned leads
                </option>
              )}
              {agentsWithLeads.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a._count.assignedLeads.toLocaleString()})
                </option>
              ))}
            </Select>
          </div>
          <Button
            variant="danger"
            onClick={unassignAgentLeads}
            disabled={
              unassigningAgent ||
              !unassignAgentId ||
              agentsWithLeads.length === 0
            }
          >
            Unassign All From{" "}
            {agentsWithLeads.find((a) => a.id === unassignAgentId)?.name ??
              "..."}
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Merge Duplicate State Values</CardTitle>
        </CardHeader>
        <p className="mb-3 text-sm text-muted">
          If leads got imported with inconsistent state values (e.g. some rows
          say &quot;FL&quot;, others say &quot;Florida&quot; or &quot;fl&quot;),
          check the ones you want combined below, pick the correct two-letter
          code to merge them into, and merge. This changes the stored state on
          every matching lead — it does not delete anything.
        </p>

        {mergeMessage && (
          <p className="mb-3 text-sm text-teal-light">{mergeMessage}</p>
        )}

        <div className="mb-3 flex flex-wrap items-end gap-3">
          <div className="w-64">
            <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
              Search state values
            </label>
            <Input
              value={mergeSearch}
              onChange={(e) => setMergeSearch(e.target.value)}
              placeholder="e.g. Fl"
            />
          </div>
          <Button
            variant="secondary"
            onClick={toggleAllShown}
            disabled={filteredMergeStates.length === 0}
          >
            {allShownSelected ? "Deselect" : "Select"} All Shown (
            {filteredMergeStates.length})
          </Button>
        </div>

        <div className="mb-4 grid max-h-56 grid-cols-2 gap-1.5 overflow-y-auto rounded-lg border border-border bg-surface p-3 sm:grid-cols-3">
          {filteredMergeStates.map((s) => (
            <label
              key={s.state}
              className="flex items-center gap-2 text-sm text-muted"
            >
              <input
                type="checkbox"
                checked={mergeFrom.has(s.state)}
                onChange={() => toggleMergeFrom(s.state)}
              />
              {s.state} ({s.count.toLocaleString()})
            </label>
          ))}
          {filteredMergeStates.length === 0 && (
            <p className="col-span-full py-2 text-sm text-muted">
              No state values match &quot;{mergeSearch}&quot;.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div className="w-56">
            <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
              Merge into
            </label>
            <Select
              value={mergeTo}
              onChange={(e) => setMergeTo(e.target.value)}
            >
              <option value="">Select target state...</option>
              {US_STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.code} — {s.name}
                </option>
              ))}
            </Select>
          </div>
          <Button
            onClick={mergeStates}
            disabled={merging || mergeFrom.size === 0 || !mergeTo}
          >
            Merge {mergeFrom.size > 0 ? `${mergeFrom.size} value(s)` : ""} Into{" "}
            {mergeTo || "..."}
          </Button>
        </div>
      </Card>
    </div>
  );
}
