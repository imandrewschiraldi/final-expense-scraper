"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  GripVertical,
  Globe,
  Lock,
} from "lucide-react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
import { useTagColors } from "./useTagColors";
import { CustomFieldsPanel } from "./CustomFieldsPanel";
import { TasksPanel } from "./TasksPanel";
import { AddSmartListModal } from "./AddSmartListModal";
import { useClickOutside } from "@/lib/useClickOutside";
import {
  ALL_COLUMNS,
  DEFAULT_VISIBLE_COLUMNS,
  EMPTY_FILTER,
  type ColumnKey,
  type ContactRow,
  type FilterGroup,
  type SmartList,
  type SortConfig,
} from "./types";

const PAGE_SIZE_OPTIONS = [20, 50, 100];

// Top-level tab bar, matching the reference CRM's Contacts page structure
// (Smart Lists | Bulk Actions | Custom Fields | Tasks | Companies). "Smart
// Lists" and "Bulk Actions" both render the same contacts table/filters —
// see the `showTable` block below — just with different surrounding chrome
// (Bulk Actions pins the bulk-action bar open and drops the per-list nav).
type TopTabKey = "smartLists" | "bulkActions" | "customFields" | "tasks" | "companies";
const TOP_TABS: { key: TopTabKey; label: string }[] = [
  { key: "smartLists", label: "Smart Lists" },
  { key: "bulkActions", label: "Bulk Actions" },
  { key: "customFields", label: "Custom Fields" },
  { key: "tasks", label: "Tasks" },
  { key: "companies", label: "Companies" },
];

// Which columns have a server-side sort field (lib/agentLeads's
// SORTABLE_FIELDS on the GET route) — the rest render as plain headers,
// not clickable.
const SORTABLE_COLUMNS: Partial<Record<ColumnKey, string>> = {
  name: "name",
  phone: "phone",
  email: "email",
  age: "age",
  status: "status",
  created: "created",
  lastActivity: "lastActivity",
};

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

function SortableColumnRow({ label, columnKey, onHide }: { label: string; columnKey: ColumnKey; onHide: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: columnKey });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 text-sm text-foreground">
      <span {...attributes} {...listeners} className="flex h-5 w-5 shrink-0 cursor-grab items-center justify-center text-muted active:cursor-grabbing">
        <GripVertical className="h-3.5 w-3.5" />
      </span>
      <input type="checkbox" checked readOnly onClick={onHide} className="cursor-pointer" />
      <span className="flex-1">{label}</span>
    </div>
  );
}

// The Columns popover — visible columns are drag-reorderable (their order
// here is exactly the table's left-to-right column order); hidden columns
// are a plain checklist below, appended to the end of visibleColumns when
// checked back on.
function ColumnsPopover({
  visibleColumns,
  setVisibleColumns,
}: {
  visibleColumns: ColumnKey[];
  setVisibleColumns: (updater: (prev: ColumnKey[]) => ColumnKey[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor),
  );
  const hidden = ALL_COLUMNS.filter((c) => !visibleColumns.includes(c.key));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = visibleColumns.indexOf(active.id as ColumnKey);
    const newIndex = visibleColumns.indexOf(over.id as ColumnKey);
    if (oldIndex === -1 || newIndex === -1) return;
    setVisibleColumns((prev) => {
      const reordered = [...prev];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);
      return reordered;
    });
  }

  return (
    <div className="absolute top-full right-0 z-20 mt-1 w-60 space-y-3 rounded-lg border border-border bg-surface p-3 shadow-xl">
      <div>
        <p className="font-condensed mb-1.5 text-[10px] font-bold tracking-[0.1em] text-muted uppercase">Visible — drag to reorder</p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={visibleColumns} strategy={verticalListSortingStrategy}>
            <div className="space-y-1.5">
              {visibleColumns.map((key) => (
                <SortableColumnRow
                  key={key}
                  columnKey={key}
                  label={ALL_COLUMNS.find((c) => c.key === key)!.label}
                  onHide={() => setVisibleColumns((prev) => prev.filter((c) => c !== key))}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
      {hidden.length > 0 && (
        <div>
          <p className="font-condensed mb-1.5 text-[10px] font-bold tracking-[0.1em] text-muted uppercase">Hidden</p>
          <div className="space-y-1.5">
            {hidden.map((col) => (
              <label key={col.key} className="flex items-center gap-2 pl-7 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => setVisibleColumns((prev) => [...prev, col.key])}
                />
                {col.label}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ContactsPage({
  initialContacts,
  initialTotal,
}: {
  initialContacts: ContactRow[];
  initialTotal: number;
}) {
  const [archiveView, setArchiveView] = useState(false);
  const [stateFilter, setStateFilter] = useState("");
  const [stateOptions, setStateOptions] = useState<{ state: string; count: number }[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [smartLists, setSmartLists] = useState<SmartList[]>([]);
  const [activeSmartListId, setActiveSmartListId] = useState<string>("all");
  const [showManageSmartLists, setShowManageSmartLists] = useState(false);
  const [showAddSmartList, setShowAddSmartList] = useState(false);

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
  // "Select all N matching this filter" mode — once active, every contact
  // matching the current view is considered selected except whatever's in
  // excludedIds (unchecked back out one at a time), rather than tracking
  // potentially thousands of ids on the client.
  const [selectAllMatching, setSelectAllMatching] = useState(false);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const { colorFor } = useTagColors();

  const [showAddContact, setShowAddContact] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showColumns, setShowColumns] = useState(false);
  const columnsRef = useRef<HTMLDivElement>(null);
  useClickOutside(columnsRef, showColumns, () => setShowColumns(false));
  const [drawerContactId, setDrawerContactId] = useState<string | null>(null);
  const [bulkTaskPrompt, setBulkTaskPrompt] = useState(false);
  const [activeTopTab, setActiveTopTab] = useState<TopTabKey>("smartLists");

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
    fetch("/api/agent/smart-lists")
      .then((res) => res.json())
      .then((data) => setSmartLists(data.smartLists ?? []))
      .catch(() => {});
  }, []);

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
    if (stateFilter) params.set("state", stateFilter);
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (sortConfig) {
      params.set("sortKey", sortConfig.key);
      params.set("sortDir", sortConfig.dir);
    }
    if (filterGroup.conditions.length > 0) params.set("filters", JSON.stringify(filterGroup));
    return params.toString();
  }, [archiveView, stateFilter, debouncedSearch, sortConfig, filterGroup, page, pageSize]);

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

  function clearSelection() {
    setSelectedIds(new Set());
    setSelectAllMatching(false);
    setExcludedIds(new Set());
  }

  function isRowSelected(id: string) {
    return selectAllMatching ? !excludedIds.has(id) : selectedIds.has(id);
  }

  function toggleSelectAll() {
    const allSelected = contacts.length > 0 && contacts.every((c) => isRowSelected(c.id));
    if (allSelected) {
      clearSelection();
    } else {
      setSelectAllMatching(false);
      setExcludedIds(new Set());
      setSelectedIds(new Set(contacts.map((c) => c.id)));
    }
  }

  function toggleSelect(id: string) {
    if (selectAllMatching) {
      setExcludedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedCount = selectAllMatching ? total - excludedIds.size : selectedIds.size;

  async function bulkAction(body: Record<string, unknown>) {
    const selection = selectAllMatching
      ? {
          selectAllMatching: true,
          archived: archiveView,
          state: stateFilter || null,
          q: debouncedSearch || null,
          filters: filterGroup.conditions.length > 0 ? filterGroup : null,
          excludedIds: Array.from(excludedIds),
        }
      : { ids: Array.from(selectedIds) };
    await fetch("/api/agent/leads/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...selection, ...body }),
    });
    clearSelection();
    reload();
  }

  function cycleSort(columnKey: ColumnKey) {
    const key = SORTABLE_COLUMNS[columnKey];
    if (!key) return;
    setSortConfig((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
    setPage(0);
  }

  function exportCsv(selectedOnly: boolean) {
    const params = new URLSearchParams();
    if (selectedOnly && !selectAllMatching && selectedIds.size > 0) {
      params.set("ids", Array.from(selectedIds).join(","));
    } else {
      // Either no selection, or "select all matching" — both cases just
      // export everything the current view's own filters match (minus
      // explicit per-row exclusions isn't supported for CSV export, an
      // accepted simplification over the exact in-app selection).
      if (archiveView) params.set("archived", "true");
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
      const isGlobal = window.confirm(
        "Share this smart list with the whole team (Global)?\n\nOK = Global, visible to every agent.\nCancel = Private, only visible to you.",
      );
      const res = await fetch("/api/agent/smart-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, isGlobal, ...payload }),
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

  const showTable = activeTopTab === "smartLists" || activeTopTab === "bulkActions";

  return (
    <div>
      {/* Top-level tab bar */}
      <div className="mb-5 flex flex-wrap items-center gap-6 border-b border-border">
        {TOP_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTopTab(tab.key)}
            className={cn(
              "font-condensed shrink-0 border-b-2 pb-2.5 text-[13px] font-bold tracking-[0.05em] uppercase transition-colors",
              activeTopTab === tab.key
                ? "border-copper text-foreground"
                : "border-transparent text-muted hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTopTab === "smartLists" && (
        <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
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
          <Button onClick={() => setShowAddContact(true)}>
            <Plus className="h-4 w-4" />
            Add Contact
          </Button>
          <Button variant="secondary" onClick={() => setShowImport(true)}>
            Import
          </Button>
          <Button variant="secondary" onClick={() => exportCsv(selectedCount > 0)}>
            Export{selectedCount > 0 ? ` (${selectedCount.toLocaleString()})` : ""}
          </Button>
        </div>
      )}

      {activeTopTab === "customFields" && <CustomFieldsPanel />}
      {activeTopTab === "tasks" && <TasksPanel />}
      {activeTopTab === "companies" && (
        <div className="rounded-[10px] border border-border bg-surface p-6 text-center text-sm text-muted">
          Companies aren&apos;t used in this book of business — every contact here is an individual
          client, not an organization. This tab is kept for layout parity only.
        </div>
      )}

      {activeTopTab === "bulkActions" && (
        <p className="mb-4 text-sm text-muted">
          Select contacts below, then choose an action to apply to all of them at once.
        </p>
      )}

      {/* Smart List tab bar — plain pressable words, not boxed buttons,
          matching the reference CRM's "All / + Add smart list" row. */}
      {activeTopTab === "smartLists" && (
      <div className="mb-3 flex flex-wrap items-center gap-5 border-b border-border pb-3">
        <div className="flex flex-wrap items-center gap-5 overflow-x-auto">
          <button
            type="button"
            onClick={() => switchSmartList("all")}
            className={cn(
              "font-condensed shrink-0 pb-1 text-[13px] font-bold tracking-[0.05em] uppercase transition-colors",
              activeSmartListId === "all"
                ? "border-b-2 border-copper text-foreground"
                : "border-b-2 border-transparent text-muted hover:text-foreground",
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
                "font-condensed shrink-0 pb-1 text-[13px] font-bold tracking-[0.05em] uppercase transition-colors",
                activeSmartListId === list.id
                  ? "border-b-2 border-copper text-foreground"
                  : "border-b-2 border-transparent text-muted hover:text-foreground",
              )}
            >
              {list.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowAddSmartList(true)}
            className="font-condensed shrink-0 flex items-center gap-1 pb-1 text-[13px] font-bold tracking-[0.05em] text-muted uppercase hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Smart List
          </button>
          {smartLists.length > 0 && (
            <button
              type="button"
              onClick={() => setShowManageSmartLists(true)}
              className="font-condensed shrink-0 pb-1 text-[13px] font-bold tracking-[0.05em] text-muted uppercase hover:text-foreground"
            >
              Manage Lists
            </button>
          )}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-3">
          {isDirty && (
            <>
              <span className="font-condensed text-[11px] font-bold tracking-wide text-amber uppercase">Unsaved changes</span>
              <button type="button" onClick={() => saveSmartList(false)} className="font-condensed text-[13px] font-bold text-muted uppercase hover:text-foreground">
                Save Changes
              </button>
              <button type="button" onClick={() => saveSmartList(true)} className="font-condensed text-[13px] font-bold text-muted uppercase hover:text-foreground">
                Save as New
              </button>
            </>
          )}
          <div className="relative" ref={columnsRef}>
            <button
              type="button"
              onClick={() => setShowColumns((s) => !s)}
              className="font-condensed flex items-center gap-1 text-[13px] font-bold text-muted uppercase hover:text-foreground"
            >
              <Columns3 className="h-3.5 w-3.5" />
              Customize List
            </button>
            {showColumns && (
              <ColumnsPopover visibleColumns={visibleColumns} setVisibleColumns={setVisibleColumns} />
            )}
          </div>
        </div>
      </div>
      )}

      {showTable && (
      <>
      {/* Filters row */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => setShowFilters(true)}>
            <Filter className="h-4 w-4" />
            More Filters
            {filterGroup.conditions.length > 0 && (
              <span className="ml-1 rounded-full bg-copper px-1.5 text-[10px] font-extrabold text-black">
                {filterGroup.conditions.length}
              </span>
            )}
          </Button>
          <Select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} className="!w-40">
            <option value="">All States</option>
            {stateOptions.map((s) => (
              <option key={s.state} value={s.state}>
                {s.state} ({s.count.toLocaleString()})
              </option>
            ))}
          </Select>
          <button
            onClick={() => setArchiveView((v) => !v)}
            className={cn(
              "font-condensed rounded-lg border-[1.5px] px-4 py-2 text-[13px] font-bold tracking-[0.05em] uppercase transition-colors",
              archiveView ? "toggle-pill-active" : "border-border text-muted hover:border-copper-gradient hover:text-foreground",
            )}
          >
            Archive
          </button>
        </div>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, phone, email…"
          className="!w-56"
        />
      </div>

      {/* Bulk action bar — pinned open on the dedicated Bulk Actions tab,
          otherwise only shown once something's selected. */}
      {(selectedCount > 0 || activeTopTab === "bulkActions") && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-copper-dim-gradient bg-surface2 px-4 py-2.5">
          <span className="text-sm text-foreground">{selectedCount.toLocaleString()} selected</span>
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
              if (window.confirm(`Delete ${selectedCount.toLocaleString()} contact(s)? This can't be undone.`)) {
                bulkAction({ action: "delete" });
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
          {!selectAllMatching && selectedIds.size === contacts.length && total > contacts.length && (
            <button
              type="button"
              onClick={() => {
                setSelectAllMatching(true);
                setExcludedIds(new Set());
              }}
              className="font-condensed ml-auto text-[11px] font-bold tracking-wide text-teal-light uppercase hover:underline"
            >
              All {contacts.length} on this page selected · Select all {total.toLocaleString()} matching this filter
            </button>
          )}
          {selectAllMatching && (
            <span className="font-condensed ml-auto text-[11px] font-bold tracking-wide text-muted uppercase">
              All {total.toLocaleString()} matching contacts selected
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
                  checked={contacts.length > 0 && contacts.every((c) => isRowSelected(c.id))}
                  onChange={toggleSelectAll}
                />
              </th>
              {visibleColumns.map((key) => {
                const col = ALL_COLUMNS.find((c) => c.key === key)!;
                const sortField = SORTABLE_COLUMNS[key];
                const isSorted = sortField && sortConfig?.key === sortField;
                return (
                  <th
                    key={key}
                    onClick={sortField ? () => cycleSort(key) : undefined}
                    className={cn(
                      "px-4 py-3",
                      sortField && "cursor-pointer select-none hover:text-foreground",
                      key === "name" && "sticky left-10 z-10 bg-surface shadow-[2px_0_4px_rgba(0,0,0,0.3)]",
                    )}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {isSorted && (
                        <span className="metal-copper-text">{sortConfig?.dir === "asc" ? "↑" : "↓"}</span>
                      )}
                    </span>
                  </th>
                );
              })}
              <th className="w-28 px-4 py-3" />
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
                    <input type="checkbox" checked={isRowSelected(contact.id)} onChange={() => toggleSelect(contact.id)} />
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
                        <Link
                          href={`/agent/leads/${contact.id}`}
                          className="text-left text-white hover:metal-copper-text"
                        >
                          {contact.firstName} {contact.lastName}
                        </Link>
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
                            <span
                              key={t}
                              style={{ backgroundColor: `${colorFor(t)}26`, color: colorFor(t) }}
                              className="font-condensed rounded-full px-2 py-0.5 text-[10px] font-bold"
                            >
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
                  <td className="w-28 px-4 py-3">
                    <div className="flex items-center gap-1 pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100">
                      {/* Call/SMS are disabled for now — shown for layout parity with the
                          reference CRM, but intentionally inert (no dialer/SMS integration
                          wired up yet). Not real <a> links, so there's nothing to click through to. */}
                      <span title="Call (coming soon)" aria-disabled="true" className="cursor-not-allowed text-muted opacity-40">
                        <PhoneIcon className="h-4 w-4" />
                      </span>
                      <span title="SMS (coming soon)" aria-disabled="true" className="cursor-not-allowed text-muted opacity-40">
                        <MessageSquare className="h-4 w-4" />
                      </span>
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
      </>
      )}

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
          countParams={(() => {
            const params = new URLSearchParams();
            if (archiveView) params.set("archived", "true");
            if (stateFilter) params.set("state", stateFilter);
            if (debouncedSearch) params.set("q", debouncedSearch);
            return params;
          })()}
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
      {showAddSmartList && (
        <AddSmartListModal
          pageSize={pageSize}
          onClose={() => setShowAddSmartList(false)}
          onCreated={(list) => {
            setSmartLists((prev) => [...prev, list]);
            // Apply the new list's own settings directly rather than calling
            // switchSmartList(list.id) — that reads `smartLists` from this
            // render's closure, which doesn't have the just-created list yet.
            setActiveSmartListId(list.id);
            setPage(0);
            setFilterGroup(list.filterConditions ?? EMPTY_FILTER);
            setVisibleColumns(list.visibleColumns.length > 0 ? (list.visibleColumns as ColumnKey[]) : DEFAULT_VISIBLE_COLUMNS);
            setSortConfig(list.sortConfig ?? null);
            setPageSize(list.pageSize);
          }}
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

function SmartListRow({
  list,
  editingId,
  editingName,
  setEditingName,
  onStartEdit,
  onRename,
  onToggleGlobal,
  onDuplicate,
  onRemove,
}: {
  list: SmartList;
  editingId: string | null;
  editingName: string;
  setEditingName: (name: string) => void;
  onStartEdit: () => void;
  onRename: () => void;
  onToggleGlobal: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: list.id,
    disabled: !list.isOwner,
  });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const isEditing = editingId === list.id;

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 rounded-lg border border-border bg-surface2 p-2.5">
      <span
        {...(list.isOwner ? attributes : {})}
        {...(list.isOwner ? listeners : {})}
        title={list.isOwner ? "Drag to reorder" : undefined}
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center text-muted",
          list.isOwner ? "cursor-grab touch-none active:cursor-grabbing" : "opacity-20",
        )}
      >
        <GripVertical className="h-4 w-4" />
      </span>
      {isEditing ? (
        <Input
          value={editingName}
          onChange={(e) => setEditingName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onRename()}
          autoFocus
          className="flex-1"
        />
      ) : (
        <span className="flex-1 text-sm text-foreground">{list.name}</span>
      )}
      {list.isOwner ? (
        <button
          type="button"
          onClick={onToggleGlobal}
          title={list.isGlobal ? "Global — visible to every agent. Click to make Private." : "Private — only you. Click to share with the team."}
          className={cn("shrink-0", list.isGlobal ? "text-teal-light" : "text-muted hover:text-foreground")}
        >
          {list.isGlobal ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
        </button>
      ) : (
        <span title="Global — shared by a teammate" className="shrink-0 text-teal-light">
          <Globe className="h-4 w-4" />
        </span>
      )}
      {isEditing ? (
        <Button variant="ghost" className="text-xs" onClick={onRename}>
          Save
        </Button>
      ) : (
        <button
          type="button"
          onClick={onStartEdit}
          disabled={!list.isOwner}
          className="text-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-20"
          aria-label="Rename"
        >
          <Pencil className="h-4 w-4" />
        </button>
      )}
      <button type="button" onClick={onDuplicate} className="text-muted hover:text-foreground" aria-label="Duplicate">
        <Copy className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onRemove}
        disabled={!list.isOwner}
        className="text-muted hover:text-red-light disabled:cursor-not-allowed disabled:opacity-20"
        aria-label="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </button>
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
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor),
  );

  async function rename(id: string) {
    if (!editingName.trim()) return;
    const res = await fetch(`/api/agent/smart-lists/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editingName.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      onChange(smartLists.map((s) => (s.id === id ? { ...data.smartList, isOwner: s.isOwner } : s)));
    }
    setEditingId(null);
  }

  async function toggleGlobal(list: SmartList) {
    const res = await fetch(`/api/agent/smart-lists/${list.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isGlobal: !list.isGlobal }),
    });
    if (res.ok) {
      const data = await res.json();
      onChange(smartLists.map((s) => (s.id === list.id ? { ...data.smartList, isOwner: s.isOwner } : s)));
    }
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
      onChange([...smartLists, { ...data.smartList, isOwner: true }]);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this smart list?")) return;
    const res = await fetch(`/api/agent/smart-lists/${id}`, { method: "DELETE" });
    if (res.ok) onChange(smartLists.filter((s) => s.id !== id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = smartLists.map((s) => s.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = [...smartLists];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    onChange(reordered);
    // Only persist new positions for lists this agent owns — a Global list
    // someone else made can't be reordered via this agent's PATCH anyway
    // (ownerId-scoped), so it just keeps whatever order value it already has.
    await Promise.all(
      reordered.map((list, index) =>
        list.isOwner && list.order !== index
          ? fetch(`/api/agent/smart-lists/${list.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ order: index }),
            })
          : Promise.resolve(),
      ),
    );
  }

  return (
    <Modal open onClose={onClose} title="Manage Smart Lists" maxWidthClassName="max-w-md">
      {smartLists.length === 0 && <p className="text-sm text-muted">No saved smart lists yet.</p>}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={smartLists.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {smartLists.map((list) => (
              <SmartListRow
                key={list.id}
                list={list}
                editingId={editingId}
                editingName={editingName}
                setEditingName={setEditingName}
                onStartEdit={() => {
                  setEditingId(list.id);
                  setEditingName(list.name);
                }}
                onRename={() => rename(list.id)}
                onToggleGlobal={() => toggleGlobal(list)}
                onDuplicate={() => duplicate(list)}
                onRemove={() => remove(list.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
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
