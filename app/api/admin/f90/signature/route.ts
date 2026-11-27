import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { setF90SignatureName } from "@/lib/agencySettings";

// The name printed in cursive on the F90 Graduation Certificate as "your
// digital signature as Agency Owner" — agency-wide (one certificate
// design for everyone), same as the other settings in lib/agencySettings.ts.
export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  const settings = await setF90SignatureName(name || null);
  return NextResponse.json({ f90SignatureName: settings.f90SignatureName });
}
