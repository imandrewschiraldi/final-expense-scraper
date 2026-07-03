import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { importLeadsFromCsv, type ColumnMapping } from "@/lib/csv";
import { isLeadType } from "@/lib/leadType";

// Importing tens of thousands of rows takes longer than the default
// serverless timeout — give it as much room as the plan allows.
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
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
  const result = await importLeadsFromCsv(content, guard.session.user.id, file.name, leadTypeRaw, mapping);

  return NextResponse.json(result);
}
