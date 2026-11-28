import { Prisma } from "@prisma/client";

// Shared between the Contacts page's filter-drawer UI (which builds one of
// these) and the GET /api/agent/leads route (which turns it into a Prisma
// where clause) — kept here rather than in the component tree so the API
// route can import it without reaching into components/.
export type FilterCondition = {
  id: string;
  field: "firstName" | "lastName" | "phone" | "email" | "source" | "state" | "createdAt" | "updatedAt" | "tags" | "hasOpenTask";
  operator: string;
  value: string;
};

export type FilterGroup = {
  logic: "AND" | "OR";
  conditions: FilterCondition[];
};

function conditionToPrisma(condition: FilterCondition): Prisma.LeadWhereInput | null {
  const { field, operator, value } = condition;
  switch (field) {
    case "firstName":
    case "lastName":
    case "email":
    case "state":
    case "source":
      if (!value.trim()) return null;
      return operator === "equals"
        ? { [field]: { equals: value, mode: "insensitive" } }
        : { [field]: { contains: value, mode: "insensitive" } };
    case "phone": {
      const digits = value.replace(/[^\d]/g, "");
      return digits ? { phone: { contains: digits } } : null;
    }
    case "createdAt":
    case "updatedAt": {
      const date = new Date(value);
      if (!value || Number.isNaN(date.getTime())) return null;
      return operator === "after" ? { [field]: { gte: date } } : { [field]: { lte: date } };
    }
    case "tags": {
      const tags = value
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      if (tags.length === 0) return null;
      if (operator === "includesAll") return { AND: tags.map((t) => ({ tags: { has: t } })) };
      if (operator === "excludes") return { NOT: { tags: { hasSome: tags } } };
      return { tags: { hasSome: tags } };
    }
    case "hasOpenTask":
      return operator === "isTrue"
        ? { tasks: { some: { completed: false } } }
        : { tasks: { none: { completed: false } } };
    default:
      return null;
  }
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
