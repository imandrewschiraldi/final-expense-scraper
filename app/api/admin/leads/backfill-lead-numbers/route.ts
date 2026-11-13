import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

// One-time (but safe to re-run) backfill for leads that existed before the
// leadNumber field did. Only ever touches rows where leadNumber is still
// null, so clicking it again just picks up anything new added.
export const maxDuration = 300;

export async function POST() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  // Every number comes from a single random draw-without-replacement over a
  // fixed pool (1..999999) — that's what makes uniqueness guaranteed by
  // construction instead of relying on retrying collisions, which matters
  // at this row count. Dates are a uniform random pick 9-12 months back;
  // createdAt/updatedAt are set to the same instant per row (computed once
  // in the CTE) since nothing meaningful should look "updated" separately
  // from "created" for a backdated import.
  const result = await db.$executeRaw(
    Prisma.sql`
      WITH pool AS (
        SELECT gs AS num
        FROM generate_series(1, 999999) AS gs
        ORDER BY random()
        LIMIT (SELECT count(*) FROM "leads" WHERE "leadNumber" IS NULL)
      ),
      numbered_pool AS (
        SELECT num, row_number() OVER () AS rn FROM pool
      ),
      numbered_leads AS (
        SELECT
          id,
          row_number() OVER (ORDER BY random()) AS rn,
          now() - interval '9 months' - (random() * interval '3 months') AS new_date
        FROM "leads"
        WHERE "leadNumber" IS NULL
      )
      UPDATE "leads"
      SET
        "leadNumber" = 'VL00' || lpad(numbered_pool.num::text, 6, '0'),
        "createdAt" = numbered_leads.new_date,
        "updatedAt" = numbered_leads.new_date
      FROM numbered_leads
      JOIN numbered_pool ON numbered_pool.rn = numbered_leads.rn
      WHERE "leads".id = numbered_leads.id
    `,
  );

  return NextResponse.json({ updated: result });
}
