import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";

// Returns every distinct value actually stored in leads.state, with counts.
// Deliberately not limited to the 50 canonical codes — the whole point is
// to surface messy/duplicate values (e.g. "FL" vs "Florida" vs "fl") left
// over from imports done before state normalization existed, so an admin
// can find and merge them.
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { searchParams } = new URL(req.url);
  const isVaultedParam = searchParams.get("isVaulted");

  const grouped = await db.lead.groupBy({
    by: ["state"],
    where: isVaultedParam === "true" || isVaultedParam === "false" ? { isVaulted: isVaultedParam === "true" } : {},
    _count: { _all: true },
  });

  const states = grouped
    .map((g) => ({ state: g.state, count: g._count._all }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({ states });
}
