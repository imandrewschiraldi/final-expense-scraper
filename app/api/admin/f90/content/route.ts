import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";

// Every mission's admin override, if any — the Admin > F90 "Mission
// Content" panel starts from F90_PHASES' own defaults and layers these on
// top client-side, the same way the agent-facing page does server-side via
// f90ApplyStepOverrides.
export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const rows = await db.f90StepContent.findMany();
  return NextResponse.json({ overrides: rows });
}
