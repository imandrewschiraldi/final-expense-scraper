import { NextRequest, NextResponse } from "next/server";
import { requireAgent } from "@/lib/apiAuth";
import { importLeadsFromCsv, type ColumnMapping } from "@/lib/csv";
import { isLeadType } from "@/lib/leadType";

// Mirrors the admin import route's timeout headroom — see that route for why.
export const maxDuration = 300;

/**
 * Lets an agent import their own leads (e.g. a personal referral list)
 * straight into their own book — no "unassigned pool" or "vault"
 * destination like the admin flow, since importing your own leads means
 * you expect to own them immediately. Reuses the exact same CSV parsing/
 * dedup pipeline as the admin importer.
 */
export async function POST(req: NextRequest) {
  const guard = await requireAgent();
  if ("error" in guard) return guard.error;

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const leadTypeRaw = formData.get("leadType");
  if (typeof leadTypeRaw !== "string" || !isLeadType(leadTypeRaw)) {
    return NextResponse.json({ error: "Missing or invalid lead type" }, { status: 400 });
  }

  const mappingRaw = formData.get("mapping");
  let mapping: ColumnMapping | undefined;
  if (typeof mappingRaw === "string" && mappingRaw.length > 0) {
    try {
      mapping = JSON.parse(mappingRaw) as ColumnMapping;
    } catch {
      return NextResponse.json({ error: "Invalid column mapping" }, { status: 400 });
    }
  }

  const content = await file.text();
  const agentId = guard.session.user.id;
  const result = await importLeadsFromCsv(content, agentId, file.name, leadTypeRaw, mapping, "self", agentId);

  return NextResponse.json(result);
}
