import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { importLeadsFromCsv } from "@/lib/csv";

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

  const content = await file.text();
  const result = await importLeadsFromCsv(content, guard.session.user.id, file.name);

  return NextResponse.json(result);
}
