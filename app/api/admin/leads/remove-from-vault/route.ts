import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { isLeadType } from "@/lib/leadType";
import { Prisma } from "@prisma/client";

// Pulls leads back out of the shared vault into the regular unassigned
// pool, clearing vaultOrigin too so they behave as ordinary leads going
// forward (normal 8-week recycle rules instead of the vault's).
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const body = await req.json().catch(() => ({}));
  const { ids, state, leadType, phones } = body as {
    ids?: string[];
    state?: string;
    leadType?: string;
    phones?: string[];
  };

  if (
    (!ids || ids.length === 0) &&
    !state &&
    !leadType &&
    (!phones || phones.length === 0)
  ) {
    return NextResponse.json(
      { error: "No leads specified to remove from vault" },
      { status: 400 },
    );
  }

  let matchedIds = ids;

  if (phones && phones.length > 0) {
    // Tolerant of whatever a phone was originally imported as (with/without
    // a leading "1", with punctuation) — match on the last 10 digits.
    const normalized = [
      ...new Set(
        phones
          .map((p) => p.replace(/\D/g, ""))
          .map((p) => (p.length === 11 && p.startsWith("1") ? p.slice(1) : p))
          .filter((p) => p.length === 10),
      ),
    ];
    if (normalized.length === 0) {
      return NextResponse.json(
        { error: "No valid 10-digit phone numbers found" },
        { status: 400 },
      );
    }
    // Character class, not the "\D" shorthand — the latter gets mangled by
    // Prisma's query translation layer for the pg driver adapter (it
    // reaches Postgres as something other than "non-digit").
    const matches = await db.$queryRaw<{ id: string }[]>(
      Prisma.sql`SELECT id FROM "leads" WHERE "isVaulted" = true AND right(regexp_replace(phone, '[^0-9]', '', 'g'), 10) = ANY(${normalized}::text[])`,
    );
    matchedIds = matches.map((m) => m.id);
    if (matchedIds.length === 0) {
      return NextResponse.json({ removed: 0, matched: 0 });
    }
  }

  const where: Prisma.LeadWhereInput = { isVaulted: true };
  if (matchedIds && matchedIds.length > 0) {
    where.id = { in: matchedIds };
  } else {
    if (state) where.state = state;
    if (leadType && isLeadType(leadType)) where.leadType = leadType;
  }

  const result = await db.lead.updateMany({
    where,
    data: { isVaulted: false, vaultOrigin: false },
  });

  return NextResponse.json(
    phones && phones.length > 0
      ? { removed: result.count, matched: matchedIds?.length ?? 0 }
      : { removed: result.count },
  );
}
