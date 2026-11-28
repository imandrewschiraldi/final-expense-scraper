import { LeadStatus } from "@/lib/leadStatus";
import { LeadType } from "@/lib/leadType";
import type { FilterCondition, FilterGroup } from "@/lib/contactFilters";

export type { FilterCondition, FilterGroup };

export type PipelineStage = { id: string; name: string; systemKey: string | null };

// One row of the Contacts table — a subset of Lead plus the two relation
// counts the table needs (tasks/notes), not the full detail-page record.
export type ContactRow = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  state: string;
  dateOfBirth: string | null;
  age: number | null;
  leadType: LeadType;
  status: LeadStatus;
  pipelineStage: PipelineStage | null;
  source: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  openTaskCount: number;
  nextTaskDueAt: string | null;
};

export type SortConfig = { key: string; dir: "asc" | "desc" } | null;

export type SmartList = {
  id: string;
  name: string;
  filterConditions: FilterGroup;
  visibleColumns: string[];
  sortConfig: SortConfig;
  pageSize: number;
  order: number;
};

export const ALL_COLUMNS = [
  { key: "name", label: "Contact Name" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "product", label: "Product" },
  { key: "source", label: "Source" },
  { key: "age", label: "Age" },
  { key: "status", label: "Status" },
  { key: "created", label: "Created" },
  { key: "lastActivity", label: "Last Activity" },
  { key: "tags", label: "Tags" },
  { key: "nextTask", label: "Next Task" },
] as const;

export type ColumnKey = (typeof ALL_COLUMNS)[number]["key"];

export const DEFAULT_VISIBLE_COLUMNS: ColumnKey[] = [
  "name",
  "phone",
  "product",
  "source",
  "age",
  "status",
  "created",
  "lastActivity",
  "tags",
];

export const EMPTY_FILTER: FilterGroup = { logic: "AND", conditions: [] };
