import { Prisma } from "@prisma/client";
import { startOfDay, endOfDay, subDays, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

// Shared between the Contacts page's filter-drawer UI (which builds one of
// these) and the GET /api/agent/leads route (which turns it into a Prisma
// where clause) — kept here rather than in the component tree so the API
// route can import it without reaching into components/. The operator set
// per field mirrors the reference CRM's filter matrix, but conditions stay
// a flat AND/OR list (not nested groups) — a deliberate scope call, not a
// gap: a single agent's own book of leads doesn't need group-of-groups
// boolean logic to be useful.
export type FilterField =
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "state"
  | "source"
  | "city"
  | "createdAt"
  | "updatedAt"
  | "tags"
  | "age"
  | "tobaccoUse"
  | "dndAll"
  | "hasOpenTask";

export type FilterCondition = {
  id: string;
  field: FilterField;
  operator: string;
  value: string;
  // Only used by "between" operators (date and numeric) — the range's end.
  value2?: string;
};

export type FilterGroup = {
  logic: "AND" | "OR";
  conditions: FilterCondition[];
};

const TEXT_FIELDS: FilterField[] = ["firstName", "lastName", "email", "state", "source", "city"];
const DATE_FIELDS: FilterField[] = ["createdAt", "updatedAt"];

function textCondition(field: string, operator: string, value: string): Prisma.LeadWhereInput | null {
  const trimmed = value.trim();
  switch (operator) {
    case "is":
      return trimmed ? { [field]: { equals: trimmed, mode: "insensitive" } } : null;
    case "isNot":
      return trimmed ? { NOT: { [field]: { equals: trimmed, mode: "insensitive" } } } : null;
    case "contains":
      return trimmed ? { [field]: { contains: trimmed, mode: "insensitive" } } : null;
    case "doesNotContain":
      return trimmed ? { NOT: { [field]: { contains: trimmed, mode: "insensitive" } } } : null;
    case "startsWith":
      return trimmed ? { [field]: { startsWith: trimmed, mode: "insensitive" } } : null;
    case "isEmpty":
      return { OR: [{ [field]: null }, { [field]: "" }] };
    case "isNotEmpty":
      return { AND: [{ [field]: { not: null } }, { [field]: { not: "" } }] };
    default:
      return null;
  }
}

function relativeDateRange(operator: string, value: string): { gte?: Date; lte?: Date } | null {
  const now = new Date();
  switch (operator) {
    case "today":
      return { gte: startOfDay(now), lte: endOfDay(now) };
    case "yesterday": {
      const y = subDays(now, 1);
      return { gte: startOfDay(y), lte: endOfDay(y) };
    }
    case "lastNDays": {
      const n = Number(value);
      if (!Number.isFinite(n) || n <= 0) return null;
      return { gte: startOfDay(subDays(now, n)), lte: endOfDay(now) };
    }
    case "nextNDays": {
      const n = Number(value);
      if (!Number.isFinite(n) || n <= 0) return null;
      return { gte: startOfDay(now), lte: endOfDay(addDays(now, n)) };
    }
    case "thisWeek":
      return { gte: startOfWeek(now), lte: endOfWeek(now) };
    case "thisMonth":
      return { gte: startOfMonth(now), lte: endOfMonth(now) };
    default:
      return null;
  }
}

function dateCondition(field: string, operator: string, value: string, value2?: string): Prisma.LeadWhereInput | null {
  const relative = relativeDateRange(operator, value);
  if (relative) return { [field]: relative };

  switch (operator) {
    case "on": {
      const d = new Date(value);
      if (!value || Number.isNaN(d.getTime())) return null;
      return { [field]: { gte: startOfDay(d), lte: endOfDay(d) } };
    }
    case "before": {
      const d = new Date(value);
      if (!value || Number.isNaN(d.getTime())) return null;
      return { [field]: { lt: startOfDay(d) } };
    }
    case "after": {
      const d = new Date(value);
      if (!value || Number.isNaN(d.getTime())) return null;
      return { [field]: { gt: endOfDay(d) } };
    }
    case "between": {
      const start = new Date(value);
      const end = new Date(value2 ?? "");
      if (!value || !value2 || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
      return { [field]: { gte: startOfDay(start), lte: endOfDay(end) } };
    }
    default:
      return null;
  }
}

function numericCondition(field: string, operator: string, value: string, value2?: string): Prisma.LeadWhereInput | null {
  switch (operator) {
    case "isEmpty":
      return { [field]: null };
    case "isNotEmpty":
      return { [field]: { not: null } };
    default: {
      const n = Number(value);
      if (!value || Number.isNaN(n)) return null;
      switch (operator) {
        case "equals":
          return { [field]: n };
        case "notEquals":
          return { NOT: { [field]: n } };
        case "gt":
          return { [field]: { gt: n } };
        case "lt":
          return { [field]: { lt: n } };
        case "between": {
          const n2 = Number(value2);
          if (!value2 || Number.isNaN(n2)) return null;
          return { [field]: { gte: Math.min(n, n2), lte: Math.max(n, n2) } };
        }
        default:
          return null;
      }
    }
  }
}

function booleanCondition(field: string, operator: string): Prisma.LeadWhereInput | null {
  if (operator === "isTrue") return { [field]: true };
  if (operator === "isFalse") return { OR: [{ [field]: false }, { [field]: null }] };
  return null;
}

function conditionToPrisma(condition: FilterCondition): Prisma.LeadWhereInput | null {
  const { field, operator, value, value2 } = condition;

  if (field === "phone") {
    const digits = value.replace(/[^\d]/g, "");
    return digits ? { phone: { contains: digits } } : null;
  }

  if (TEXT_FIELDS.includes(field)) return textCondition(field, operator, value);
  if (DATE_FIELDS.includes(field)) return dateCondition(field, operator, value, value2);
  if (field === "age") return numericCondition(field, operator, value, value2);
  if (field === "tobaccoUse" || field === "dndAll") return booleanCondition(field, operator);

  if (field === "tags") {
    const tags = value
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    switch (operator) {
      case "is":
        return tags[0] ? { tags: { has: tags[0] } } : null;
      case "isNot":
        return tags[0] ? { NOT: { tags: { has: tags[0] } } } : null;
      case "includesAny":
        return tags.length > 0 ? { tags: { hasSome: tags } } : null;
      case "includesAll":
        return tags.length > 0 ? { AND: tags.map((t) => ({ tags: { has: t } })) } : null;
      case "isEmpty":
        return { tags: { isEmpty: true } };
      case "isNotEmpty":
        return { NOT: { tags: { isEmpty: true } } };
      default:
        return null;
    }
  }

  if (field === "hasOpenTask") {
    return operator === "isTrue"
      ? { tasks: { some: { completed: false } } }
      : { tasks: { none: { completed: false } } };
  }

  return null;
}

/** Translates a filter-drawer FilterGroup into a Prisma where clause,
 *  or null if it has no usable conditions (e.g. every value field is
 *  still blank) — callers merge this onto their own base where instead of
 *  replacing it. */
export function filterGroupToWhere(group: FilterGroup | null | undefined): Prisma.LeadWhereInput | null {
  if (!group || group.conditions.length === 0) return null;
  const clauses = group.conditions.map(conditionToPrisma).filter((c): c is Prisma.LeadWhereInput => c !== null);
  if (clauses.length === 0) return null;
  return group.logic === "OR" ? { OR: clauses } : { AND: clauses };
}
