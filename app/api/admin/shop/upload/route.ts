import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { parseFlexibleDate } from "@/lib/csv";
import { resolveStateCode } from "@/lib/usStates";
import { dealIntoTiers } from "@/lib/shop/inventory";

export const maxDuration = 120;

/** Browser parses the CSV and posts it here in chunks, keeping each request small. */
const MAX_ROWS_PER_REQUEST = 5000;

type RawRow = Partial<
  Record<
    "name" | "firstName" | "lastName" | "phone" | "state" | "dob" | "email" | "address" | "zip" | "county" | "gender" | "militaryBranch",
    string
  >
>;

function clean(v: unknown) {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function normalizePhone(raw: string) {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  return digits.length === 10 ? digits : null;
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const body = await req.json().catch(() => null);
  const rows: RawRow[] = Array.isArray(body?.rows) ? body.rows : [];
  if (rows.length === 0) return NextResponse.json({ error: "No rows in this upload." }, { status: 400 });
  if (rows.length > MAX_ROWS_PER_REQUEST) {
    return NextResponse.json({ error: `Send at most ${MAX_ROWS_PER_REQUEST} rows per request.` }, { status: 400 });
  }

  let invalid = 0;
  let inFileDuplicates = 0;
  const seen = new Set<string>();
  const valid = [];
  for (const r of rows) {
    let firstName = clean(r.firstName);
    let lastName = clean(r.lastName) ?? "";
    if (!firstName && clean(r.name)) {
      const parts = clean(r.name)!.split(/\s+/);
      firstName = parts[0];
      lastName = parts.slice(1).join(" ");
    }
    const phone = r.phone ? normalizePhone(r.phone) : null;
    const state = resolveStateCode(r.state);
    if (!firstName || !phone || !state) {
      invalid++;
      continue;
    }
    if (seen.has(phone)) {
      inFileDuplicates++;
      continue;
    }
    seen.add(phone);
    const dob = clean(r.dob);
    valid.push({
      firstName,
      lastName,
      phone,
      state,
      dateOfBirth: dob ? parseFlexibleDate(dob) : null,
      email: clean(r.email),
      address: clean(r.address),
      zip: clean(r.zip),
      county: clean(r.county),
      gender: clean(r.gender),
      militaryBranch: clean(r.militaryBranch),
    });
  }

  const result = await db.shopLead.createMany({ data: dealIntoTiers(valid), skipDuplicates: true });
  return NextResponse.json({
    inserted: result.count,
    // Phone is unique in the shop, so a lead already in stock is skipped.
    duplicates: valid.length - result.count + inFileDuplicates,
    invalid,
  });
}
