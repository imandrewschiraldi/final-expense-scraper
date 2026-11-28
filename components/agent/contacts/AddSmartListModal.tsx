"use client";

import { useRef, useState } from "react";
import { ChevronRight, Copy, Download, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FiltersDrawer } from "./FiltersDrawer";
import { useClickOutside } from "@/lib/useClickOutside";
import { ALL_COLUMNS, EMPTY_FILTER, type ColumnKey, type FilterGroup, type SmartList, type SortConfig } from "./types";

const SORT_OPTIONS: { key: string; dir: "asc" | "desc"; label: string }[] = [
  { key: "created", dir: "desc", label: "Created, newest" },
  { key: "created", dir: "asc", label: "Created, oldest" },
  { key: "name", dir: "asc", label: "Name, A–Z" },
  { key: "name", dir: "desc", label: "Name, Z–A" },
  { key: "lastActivity", dir: "desc", label: "Last Activity, newest" },
];

function sortLabel(sort: SortConfig): string {
  const match = SORT_OPTIONS.find((o) => sort && o.key === sort.key && o.dir === sort.dir);
  return match?.label ?? "Created, newest";
}

// Matches the reference CRM's "Add smart list" dialog exactly: a name field,
// then Advanced Filters / Sort By / Fields rows that each drill into their
// own picker, then Duplicate/Export/Delete (all disabled here — there's
// nothing saved yet to duplicate or delete, and Export runs against
// whatever filters are currently set up in this not-yet-saved list).
export function AddSmartListModal({
  onClose,
  onCreated,
  pageSize,
}: {
  onClose: () => void;
  onCreated: (list: SmartList) => void;
  pageSize: number;
}) {
  const [name, setName] = useState("New smart list");
  const [filterGroup, setFilterGroup] = useState<FilterGroup>(EMPTY_FILTER);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "created", dir: "desc" });
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(ALL_COLUMNS.map((c) => c.key));
  const [showFilters, setShowFilters] = useState(false);
  const [showSortPicker, setShowSortPicker] = useState(false);
  const [showFieldsPicker, setShowFieldsPicker] = useState(false);
  const sortPickerRef = useRef<HTMLDivElement>(null);
  const fieldsPickerRef = useRef<HTMLDivElement>(null);
  useClickOutside(sortPickerRef, showSortPicker, () => setShowSortPicker(false));
  useClickOutside(fieldsPickerRef, showFieldsPicker, () => setShowFieldsPicker(false));
  const [saving, setSaving] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  function toggleColumn(key: ColumnKey) {
    setVisibleColumns((prev) => (prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]));
  }

  function exportCsv() {
    const params = new URLSearchParams();
    if (filterGroup.conditions.length > 0) params.set("filters", JSON.stringify(filterGroup));
    window.location.href = `/api/agent/leads/export?${params.toString()}`;
  }

  async function create() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/agent/smart-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          isGlobal: false,
          filterConditions: filterGroup,
          visibleColumns,
          sortConfig,
          pageSize,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onCreated({ ...data.smartList, isOwner: true });
        onClose();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Add Smart List" maxWidthClassName="max-w-md">
      <div className="space-y-1">
        <Input
          ref={nameInputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onFocus={(e) => e.target.select()}
          autoFocus
          className="mb-4"
        />

        <button
          type="button"
          onClick={() => setShowFilters(true)}
          className="flex w-full items-center justify-between border-b border-border py-3 text-sm text-foreground hover:text-white"
        >
          <span>Advanced filters</span>
          <span className="flex items-center gap-1 text-muted">
            {filterGroup.conditions.length} applied
            <ChevronRight className="h-4 w-4" />
          </span>
        </button>

        <div className="relative" ref={sortPickerRef}>
          <button
            type="button"
            onClick={() => setShowSortPicker((s) => !s)}
            className="flex w-full items-center justify-between border-b border-border py-3 text-sm text-foreground hover:text-white"
          >
            <span>Sort by</span>
            <span className="flex items-center gap-1 text-muted">
              {sortLabel(sortConfig)}
              <ChevronRight className="h-4 w-4" />
            </span>
          </button>
          {showSortPicker && (
            <div className="absolute top-full right-0 left-0 z-10 mt-1 rounded-lg border border-border bg-surface2 p-1.5 shadow-xl">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={`${opt.key}-${opt.dir}`}
                  type="button"
                  onClick={() => {
                    setSortConfig({ key: opt.key, dir: opt.dir });
                    setShowSortPicker(false);
                  }}
                  className="block w-full rounded px-2.5 py-1.5 text-left text-sm text-foreground hover:bg-surface"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative" ref={fieldsPickerRef}>
          <button
            type="button"
            onClick={() => setShowFieldsPicker((s) => !s)}
            className="flex w-full items-center justify-between border-b border-border py-3 text-sm text-foreground hover:text-white"
          >
            <span>Fields</span>
            <span className="flex items-center gap-1 text-muted">
              {visibleColumns.length} selected
              <ChevronRight className="h-4 w-4" />
            </span>
          </button>
          {showFieldsPicker && (
            <div className="absolute top-full right-0 left-0 z-10 mt-1 max-h-60 space-y-1 overflow-y-auto rounded-lg border border-border bg-surface2 p-2.5 shadow-xl">
              {ALL_COLUMNS.map((col) => (
                <label key={col.key} className="flex items-center gap-2 text-sm text-foreground">
                  <input type="checkbox" checked={visibleColumns.includes(col.key)} onChange={() => toggleColumn(col.key)} />
                  {col.label}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex w-full items-center justify-between border-b border-border py-3 text-sm text-muted opacity-50">
          <span>Duplicate</span>
          <Copy className="h-4 w-4" />
        </div>

        <button
          type="button"
          onClick={exportCsv}
          className="flex w-full items-center justify-between border-b border-border py-3 text-sm text-foreground hover:text-white"
        >
          <span>Export</span>
          <Download className="h-4 w-4" />
        </button>

        <div className="flex w-full items-center gap-2 py-3 text-sm text-muted opacity-50">
          <Trash2 className="h-4 w-4" />
          <span>Delete list</span>
        </div>
      </div>

      {showFilters && (
        <FiltersDrawer
          initial={filterGroup}
          onClose={() => setShowFilters(false)}
          onApply={(group) => {
            setFilterGroup(group);
            setShowFilters(false);
          }}
          countParams={new URLSearchParams()}
        />
      )}

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={create} disabled={!name.trim() || saving}>
          {saving ? "Creating…" : "Create"}
        </Button>
      </div>
    </Modal>
  );
}
