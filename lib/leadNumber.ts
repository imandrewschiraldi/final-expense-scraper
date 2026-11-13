import { db } from "@/lib/db";

// "VL00" + 6 digits — matches the format the one-time admin backfill
// assigns to every pre-existing lead (see /api/admin/leads/backfill-lead-numbers).
// 999,999 possible suffixes comfortably covers the ~120K leads on hand at
// launch with plenty of headroom; the DB's unique index is the actual
// correctness guarantee either way.
const PREFIX = "VL00";
const POOL_SIZE = 999_999;

function randomSuffix(): string {
  const n = 1 + Math.floor(Math.random() * POOL_SIZE);
  return n.toString().padStart(6, "0");
}

/**
 * Generates `count` lead numbers guaranteed not to collide with each other
 * or with anything already in the database. Used when inserting new leads
 * (CSV import) — the one-time historical backfill uses its own SQL-side
 * generator instead, since it needs to assign ~120K at once.
 */
export async function generateUniqueLeadNumbers(
  count: number,
): Promise<string[]> {
  const result: string[] = [];
  const seen = new Set<string>();

  while (result.length < count) {
    const needed = count - result.length;
    const candidates: string[] = [];
    while (candidates.length < needed) {
      const candidate = `${PREFIX}${randomSuffix()}`;
      if (seen.has(candidate)) continue;
      seen.add(candidate);
      candidates.push(candidate);
    }

    const existing = await db.lead.findMany({
      where: { leadNumber: { in: candidates } },
      select: { leadNumber: true },
    });
    const taken = new Set(existing.map((l) => l.leadNumber));

    for (const candidate of candidates) {
      if (!taken.has(candidate)) result.push(candidate);
    }
  }

  return result;
}
