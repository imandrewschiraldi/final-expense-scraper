"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  Phone as PhoneIcon,
  MessageSquare,
  ClipboardList,
  Eye,
  Filter,
  Columns3,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Pencil,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/cn";
import { formatPhone, telHref } from "@/lib/formatPhone";
import { formatDob } from "@/lib/formatDob";
import { LEAD_TYPE_LABELS } from "@/lib/leadType";
import { AddContactModal } from "./AddContactModal";
import { ImportModal } from "./ImportModal";
import { FiltersDrawer } from "./FiltersDrawer";
import { ContactDrawer } from "./ContactDrawer";
import {
  ALL_COLUMNS,
  DEFAULT_VISIBLE_COLUMNS,
  EMPTY_FILTER,
  type ColumnKey,
  type ContactRow,
  type FilterGroup,
  type PipelineStage,
  type SmartList,
  type SortConfig,
} from "./types";

const PAGE_SIZE_OPTIONS = [20, 50, 100];

function computeAge(dateOfBirth: string | null, fallback: number | null): number | null {
  if (!dateOfBirth) return fallback;
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

function loadLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveLocal(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private browsing / storage disabled — the page still works, it just
    // won't remember column/page-size prefs across reloads.
  }
}

export function ContactsPage({
  initialContacts,
  initialTotal,
}: {
  initialContacts: ContactRow[];
  initialTotal: number;
}) {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [tab, setTab] = useState<string>("ALL");
  const [archiveView, setArchiveView] = useState(false);
  const [stateFilter, setStateFilter] = useState("");
  const [stateOptions, setStateOptions] = useState<{ state: string; count: number }[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [smartLists, setSmartLists] = useState<SmartList[]>([]);
  const [activeSmartListId, setActiveSmartListId] = useState<string>("all");
  const [showManageSmartLists, setShowManageSmartLists] = useState(false);

  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(() =>
    loadLocal("contacts.visibleColumns", DEFAULT_VISIBLE_COLUMNS),
  );
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [filterGroup, setFilterGroup] = useState<FilterGroup>(EMPTY_FILTER);
  const [pageSize, setPageSize] = useState<number>(() => loadLocal("contacts.pageSize", 20));
  const [page, setPage] = useState(0);

  const [contacts, setContacts] = useState<ContactRow[]>(initialContacts);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [showAddContact, setShowAddContact] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showColumns, setShowColumns] = useState(false);
  const [drawerContactId, setDrawerContactId] = useState<string | null>(null);
  const [bulkTaskPrompt, setBulkTaskPrompt] = useState(false);

  useEffect(() => saveLocal("contacts.visibleColumns", visibleColumns), [visibleColumns]);
  useEffect(() => saveLocal("contacts.pageSize", pageSize), [pageSize]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    fetch("/api/agent/leads/states")
      .then((res) => res.json())
      .then((data) => setStateOptions(data.states))
      .catch(() => {});
    fetch("/api/portal/pipeline-stages?phase=LEAD")
      .then((res) => res.json())
      .then((data) => setStages(data.stages))
      .catch(() => {});
    fetch("/api/agent/smart-lists")
      .then((res) => res.json())
      .then((data) => setSmartLists(data.smartLists ?? []))
      .catch(() => {});
  }, []);

  const activeTabs = stages.filter((s) => s.systemKey !== "SOLD");

  const activeSmartList = smartLists.find((s) => s.id === activeSmartListId) ?? null;
  const isDirty = useMemo(() => {
    if (!activeSmartList) return false;
    return (
      JSON.stringify(activeSmartList.filterConditions) !== JSON.stringify(filterGroup) ||
      JSON.stringify(activeSmartList.visibleColumns) !== JSON.stringify(visibleColumns) ||
      JSON.stringify(activeSmartList.sortConfig) !== JSON.stringify(sortConfig) ||
      activeSmartList.pageSize !== pageSize
    );
  }, [activeSmartList, filterGroup, visibleColumns, sortConfig, pageSize]);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    params.set("paginate", "true");
    params.set("limit", String(pageSize));
    params.set("offset", String(page * pageSize));
    if (archiveView) params.set("archived", "true");
    else if (tab !== "ALL") params.set("pipelineStageId", tab);
    if (stateFilter) params.set("state", stateFilter);
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (sortConfig) {
      params.set("sortKey", sortConfig.key);
      params.set("sortDir", sortConfig.dir);
    }
    if (filterGroup.conditions.length > 0) params.set("filters", JSON.stringify(filterGroup));
    return params.toString();
  }, [archiveView, tab, stateFilter, debouncedSearch, sortConfig, filterGroup, page, pageSize]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/agent/leads?${buildQuery()}`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        setContacts(data.leads);
        setTotal(data.total ?? data.leads.length);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [buildQuery]);

  function reload() {
    fetch(`/api/agent/leads?${buildQuery()}`)
      .then((res) => res.json())
      .then((data) => {
        setContacts(data.leads);
        setTotal(data.total ?? data.leads.length);
      });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => (prev.size === contacts.length ? new Set() : new Set(contacts.map((c) => c.id))));
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulkAction(body: Record<string, unknown>) {
    await fetch("/api/agent/leads/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selectedIds), ...body }),
    });
    setSelectedIds(new Set());
    reload();
  }

  function exportCsv(selectedOnly: boolean) {
    const params = new URLSearchParams();
    if (selectedOnly && selectedIds.size > 0) {
      params.set("ids", Array.from(selectedIds).join(","));
    } else {
      if (archiveView) params.set("archived", "true");
      else if (tab !== "ALL") params.set("pipelineStageId", tab);
      if (stateFilter) params.set("state", stateFilter);
    }
    window.location.href = `/api/agent/leads/export?${params.toString()}`;
  }

  async function saveSmartList(asNew: boolean) {
    const payload = {
      filterConditions: filterGroup,
      visibleColumns,
      sortConfig,
      pageSize,
    };
    if (asNew || !activeSmartList) {
      const name = window.prompt("Name this smart list:");
      if (!name) return;
      const res = await fetch("/api/agent/smart-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, ...payload }),
      });
      if (res.ok) {
        const data = await res.json();
        setSmartLists((prev) => [...prev, data.smartList]);
        setActiveSmartListId(data.smartList.id);
      }
    } else {
      const res = await fetch(`/api/agent/smart-lists/${activeSmartList.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        setSmartLists((prev) => prev.map((s) => (s.id === data.smartList.id ? data.smartList : s)));
      }
    }
  }

  function switchSmartList(id: string) {
    setActiveSmartListId(id);
    setPage(0);
    if (id === "all") {
      setFilterGroup(EMPTY_FILTER);
      setVisibleColumns(DEFAULT_VISIBLE_COLUMNS);
      setSortConfig(null);
      setPageSize(20);
      return;
    }
    const list = smartLists.find((s) => s.id === id);
    if (list) {
      setFilterGroup(list.filterConditions ?? EMPTY_FILTER);
      setVisibleColumns(list.visibleColumns.length > 0 ? (list.visibleColumns as ColumnKey[]) : DEFAULT_VISIBLE_COLUMNS);
      setSortConfig(list.sortConfig ?? null);
      setPageSize(list.pageSize);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rangeStart = total === 0 ? 0 : page * pageSize + 1;
  const rangeEnd = Math.min(total, (page + 1) * pageSize);

  return (
    <div>
      {/* Smart List tab bar */}
      <div className="mb-3 flex flex-wrap items-center gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => switchSmartList("all")}
          className={cn(
            "font-condensed shrink-0 rounded-lg border-[1.5px] px-4 py-2 text-[13px] font-bold tracking-[0.05em] uppercase transition-colors",
            activeSmartListId === "all" ? "toggle-pill-active" : "border-copper-hover-gradient text-muted hover:text-foreground",
          )}
        >
          All Contacts
        </button>
        {smartLists.map((list) => (
          <button
            key={list.id}
            type="button"
            onClick={() => switchSmartList(list.id)}
            className={cn(
              "font-condensed shrink-0 rounded-lg border-[1.5px] px-4 py-2 text-[13px] font-bold tracking-[0.05em] uppercase transition-colors",
              activeSmartListId === list.id ? "toggle-pill-active" : "border-copper-hover-gradient text-muted hover:text-foreground",
            )}
          >
            {list.name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowManageSmartLists(true)}
          className="font-condensed shrink-0 rounded-lg border-[1.5px] border-dashed border-border px-4 py-2 text-[13px] font-bold tracking-[0.05em] text-muted uppercase hover:border-copper-hover-gradient hover:text-foreground"
        >
          <Plus className="mr-1 inline h-3.5 w-3.5" />
          Add Smart List
        </button>
        {isDirty && (
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <span className="font-condensed text-[11px] font-bold tracking-wide text-amber uppercase">Unsaved changes</span>
            <Button variant="ghost" onClick={() => saveSmartList(false)} className="text-xs">
              Save Changes
            </Button>
            <Button variant="secondary" onClick={() => saveSmartList(true)} className="text-xs">
              Save as New
            </Button>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setShowAddContact(true)}>
            <Plus className="h-4 w-4" />
            Add Contact
          </Button>
          <Button variant="secondary" onClick={() => setShowImport(true)}>
            Import
          </Button>
          <Button variant="secondary" onClick={() => exportCsv(selectedIds.size > 0)}>
            Export{selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              /* Dialer integration isn't wired up yet — intentionally a no-op for now. */
            }}
            title="Dialer integration coming soon"
          >
            <PhoneIcon className="h-4 w-4" />
            Dial this list
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, email…"
            className="w-56"
          />
          <div className="relative">
            <Button variant="secondary" onClick={() => setShowColumns((s) => !s)}>
              <Columns3 className="h-4 w-4" />
              Columns
            </Button>
            {showColumns && (
              <div className="absolute top-full right-0 z-20 mt-1 w-56 space-y-1 rounded-lg border border-border bg-surface p-3 shadow-xl">
                {ALL_COLUMNS.map((col) => (
                  <label key={col.key} className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={visibleColumns.includes(col.key)}
                      onChange={(e) =>
                        setVisibleColumns((prev) =>
                          e.target.checked ? [...prev, col.key] : prev.filter((c) => c !== col.key),
                        )
                      }
                    />
                    {col.label}
                  </label>
                ))}
              </div>
            )}
          </div>
          <Button variant="secondary" onClick={() => setShowFilters(true)}>
            <Filter className="h-4 w-4" />
            More Filters
            {filterGroup.conditions.length > 0 && (
              <span className="ml-1 rounded-full bg-copper px-1.5 text-[10px] font-extrabold text-black">
                {filterGroup.conditions.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Status tabs */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setArchiveView(false);
              setTab("ALL");
              setPage(0);
            }}
            className={cn(
              "font-condensed rounded-lg border-[1.5px] px-4 py-2 text-[13px] font-bold tracking-[0.05em] uppercase transition-colors",
              !archiveView && tab === "ALL" ? "toggle-pill-active" : "border-copper-hover-gradient text-muted hover:text-foreground",
            )}
          >
            All Active
          </button>
          {activeTabs.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setArchiveView(false);
                setTab(s.id);
                setPage(0);
              }}
              className={cn(
                "font-condensed rounded-lg border-[1.5px] px-4 py-2 text-[13px] font-bold tracking-[0.05em] uppercase transition-colors",
                !archiveView && tab === s.id ? "toggle-pill-active" : "border-copper-hover-gradient text-muted hover:text-foreground",
              )}
            >
              {s.name}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} className="w-40">
            <option value="">All States</option>
            {stateOptions.map((s) => (
              <option key={s.state} value={s.state}>
                {s.state} ({s.count.toLocaleString()})
              </option>
            ))}
          </Select>
          <button
            onClick={() => setArchiveView(true)}
            className={cn(
              "font-condensed rounded-lg border-[1.5px] px-4 py-2 text-[13px] font-bold tracking-[0.05em] uppercase transition-colors",
              archiveView ? "toggle-pill-active" : "border-border text-muted hover:border-copper-gradient hover:text-foreground",
            )}
          >
            Archive
          </button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-copper-dim-gradient bg-surface2 px-4 py-2.5">
          <span className="text-sm text-foreground">{selectedIds.size} selected</span>
          <Button
            variant="ghost"
            className="text-xs"
            onClick={() => {
              const tag = window.prompt("Tag to add:");
              if (tag) bulkAction({ action: "addTag", tag });
            }}
          >
            Add Tag
          </Button>
          <Button
            variant="ghost"
            className="text-xs"
            onClick={() => {
              const tag = window.prompt("Tag to remove:");
              if (tag) bulkAction({ action: "removeTag", tag });
            }}
          >
            Remove Tag
          </Button>
          <Button variant="ghost" className="text-xs" onClick={() => setBulkTaskPrompt(true)}>
            Create Bulk Task
          </Button>
          <Button
            variant="ghost"
            className="!text-red-light text-xs"
            onClick={() => {
              if (window.confirm(`Delete ${selectedIds.size} contact(s)? This can't be undone.`)) {
                bulkAction({ action: "delete" });
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
          {selectedIds.size === contacts.length && total > contacts.length && (
            <span className="font-condensed ml-auto text-[11px] font-bold tracking-wide text-muted uppercase">
              All {contacts.length} on this page selected · {total.toLocaleString()} match this filter
            </span>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-[10px] border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="font-condensed border-b border-border text-[11px] font-bold tracking-[0.1em] text-muted uppercase">
              <th className="sticky left-0 z-10 w-10 bg-surface px-4 py-3">
                <input
                  type="checkbox"
                  checked={contacts.length > 0 && selectedIds.size === contacts.length}
                  onChange={toggleSelectAll}
                />
              </th>
              {visibleColumns.map((key) => {
                const col = ALL_COLUMNS.find((c) => c.key === key)!;
                return (
                  <th
                    key={key}
                    className={cn(
                      "px-4 py-3",
                      key === "name" && "sticky left-10 z-10 bg-surface shadow-[2px_0_4px_rgba(0,0,0,0.3)]",
                    )}
                  >
                    {col.label}
                  </th>
                );
              })}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {!loading && contacts.length === 0 && (
              <tr>
                <td colSpan={visibleColumns.length + 2} className="px-4 py-6 text-center text-muted">
                  No contacts here.
                </td>
              </tr>
            )}
            {contacts.map((contact) => {
              const age = computeAge(contact.dateOfBirth, contact.age);
              return (
                <tr key={contact.id} className="group border-b border-border/60 hover:bg-surface2">
                  <td className="sticky left-0 z-10 bg-surface px-4 py-3 group-hover:bg-surface2">
                    <input type="checkbox" checked={selectedIds.has(contact.id)} onChange={() => toggleSelect(contact.id)} />
                  </td>
                  {visibleColumns.map((key) => (
                    <td
                      key={key}
                      className={cn(
                        "px-4 py-3 text-muted",
                        key === "name" && "sticky left-10 z-10 bg-surface shadow-[2px_0_4px_rgba(0,0,0,0.3)] group-hover:bg-surface2",
                      )}
                    >
                      {key === "name" && (
                        <button
                          type="button"
                          onClick={() => setDrawerContactId(contact.id)}
                          className="text-left text-white hover:metal-copper-text"
                        >
                          {contact.firstName} {contact.lastName}
                        </button>
                      )}
                      {key === "phone" && (
                        <a href={telHref(contact.phone)} className="hover:metal-copper-text hover:underline">
                          {formatPhone(contact.phone)}
                        </a>
                      )}
                      {key === "email" && (contact.email ?? "—")}
                      {key === "product" && LEAD_TYPE_LABELS[contact.leadType]}
                      {key === "source" && (contact.source ?? "—")}
                      {key === "age" && (age ?? "—")}
                      {key === "status" && <StatusBadge status={contact.status} pipelineStage={contact.pipelineStage} />}
                      {key === "created" && formatDob(contact.createdAt)}
                      {key === "lastActivity" && formatDistanceToNow(new Date(contact.updatedAt), { addSuffix: true })}
                      {key === "tags" && (
                        <div className="flex flex-wrap gap-1">
                          {contact.tags.slice(0, 2).map((t) => (
                            <span key={t} className="font-condensed rounded-full bg-copper-glow px-2 py-0.5 text-[10px] font-bold text-copper">
                              {t}
                            </span>
                          ))}
                          {contact.tags.length > 2 && (
                            <span className="text-[10px] text-muted">+{contact.tags.length - 2}</span>
                          )}
                        </div>
                      )}
                      {key === "nextTask" &&
                        (contact.nextTaskDueAt ? (
                          <span className="font-condensed rounded bg-amber/20 px-2 py-0.5 text-[10px] font-bold text-amber uppercase">
                            Due {formatDob(contact.nextTaskDueAt)}
                          </span>
                        ) : contact.openTaskCount > 0 ? (
                          <span className="text-xs">{contact.openTaskCount} open</span>
                        ) : (
                          "—"
                        ))}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="hidden items-center gap-1 group-hover:flex">
                      <a href={telHref(contact.phone)} title="Call" className="text-muted hover:text-foreground">
                        <PhoneIcon className="h-4 w-4" />
                      </a>
                      <a href={`sms:${contact.phone}`} title="SMS" className="text-muted hover:text-foreground">
                        <MessageSquare className="h-4 w-4" />
                      </a>
                      <button type="button" title="Add Task" onClick={() => setDrawerContactId(contact.id)} className="text-muted hover:text-foreground">
                        <ClipboardList className="h-4 w-4" />
                      </button>
                      <Link href={`/agent/leads/${contact.id}`} title="View Details" className="text-muted hover:text-foreground">
                        <Eye className="h-4 w-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
        <span>
          Showing {rangeStart}–{rangeEnd} of {total.toLocaleString()} contacts
        </span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            Show:
            {PAGE_SIZE_OPTIONS.map((size) => (
              <button
                key={size}
                onClick={() => {
                  setPageSize(size);
                  setPage(0);
                }}
                className={cn(
                  "rounded px-2 py-1 text-xs font-bold",
                  pageSize === size ? "bg-copper text-black" : "text-muted hover:text-foreground",
                )}
              >
                {size}
              </button>
            ))}
          </div>
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span>
            Page {page + 1} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {showAddContact && (
        <AddContactModal onClose={() => setShowAddContact(false)} onCreated={reload} />
      )}
      {showImport && <ImportModal onClose={() => setShowImport(false)} onImported={reload} />}
      {showFilters && (
        <FiltersDrawer
          initial={filterGroup}
          onClose={() => setShowFilters(false)}
          onApply={(group) => {
            setFilterGroup(group);
            setPage(0);
            setShowFilters(false);
          }}
        />
      )}
      {drawerContactId && <ContactDrawer leadId={drawerContactId} onClose={() => setDrawerContactId(null)} />}
      {showManageSmartLists && (
        <ManageSmartListsModal
          smartLists={smartLists}
          onClose={() => setShowManageSmartLists(false)}
          onChange={setSmartLists}
        />
      )}
      {bulkTaskPrompt && (
        <BulkTaskModal
          onClose={() => setBulkTaskPrompt(false)}
          onCreate={(title, dueAt, description) => {
            bulkAction({ action: "createTask", title, dueAt, description });
            setBulkTaskPrompt(false);
          }}
        />
      )}
    </div>
  );
}

function ManageSmartListsModal({
  smartLists,
  onClose,
  onChange,
}: {
  smartLists: SmartList[];
  onClose: () => void;
  onChange: (lists: SmartList[]) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  async function rename(id: string) {
    if (!editingName.trim()) return;
    const res = await fetch(`/api/agent/smart-lists/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editingName.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      onChange(smartLists.map((s) => (s.id === id ? data.smartList : s)));
    }
    setEditingId(null);
  }

  async function duplicate(list: SmartList) {
    const res = await fetch("/api/agent/smart-lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${list.name} (Copy)`,
        filterConditions: list.filterConditions,
        visibleColumns: list.visibleColumns,
        sortConfig: list.sortConfig,
        pageSize: list.pageSize,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      onChange([...smartLists, data.smartList]);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this smart list?")) return;
    const res = await fetch(`/api/agent/smart-lists/${id}`, { method: "DELETE" });
    if (res.ok) onChange(smartLists.filter((s) => s.id !== id));
  }

  return (
    <Modal open onClose={onClose} title="Manage Smart Lists" maxWidthClassName="max-w-md">
      <div className="space-y-2">
        {smartLists.length === 0 && <p className="text-sm text-muted">No saved smart lists yet.</p>}
        {smartLists.map((list) => (
          <div key={list.id} className="flex items-center gap-2 rounded-lg border border-border bg-surface2 p-2.5">
            {editingId === list.id ? (
              <Input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && rename(list.id)}
                autoFocus
                className="flex-1"
              />
            ) : (
              <span className="flex-1 text-sm text-foreground">{list.name}</span>
            )}
            {editingId === list.id ? (
              <Button variant="ghost" className="text-xs" onClick={() => rename(list.id)}>
                Save
              </Button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditingId(list.id);
                  setEditingName(list.name);
                }}
                className="text-muted hover:text-foreground"
                aria-label="Rename"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            <button type="button" onClick={() => duplicate(list)} className="text-muted hover:text-foreground" aria-label="Duplicate">
              <Copy className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => remove(list.id)} className="text-muted hover:text-red-light" aria-label="Delete">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function BulkTaskModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (title: string, dueAt: string | null, description: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [description, setDescription] = useState("");

  return (
    <Modal open onClose={onClose} title="Create Bulk Task" maxWidthClassName="max-w-sm">
      <div className="space-y-3">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" />
        <Input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          className="min-h-16 w-full resize-none rounded-lg border-copper-focus-gradient bg-surface2 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none"
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onCreate(title, dueAt || null, description)} disabled={!title.trim()}>
            Create
          </Button>
        </div>
      </div>
    </Modal>
  );
}
