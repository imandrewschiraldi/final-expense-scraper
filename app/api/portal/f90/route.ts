import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { isF90StepKey } from "@/lib/f90Content";

// Toggles one SOP step on/off for the current user's own F90 progress —
// the page itself (app/(portal)/f90/page.tsx) already redirects away
// anyone not enrolled, but this is re-checked here too since it's a
// write endpoint, not just a read.
export async function PATCH(req: NextRequest) {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const body = await req.json().catch(() => null);
  const stepKey = typeof body?.stepKey === "string" ? body.stepKey : "";
  const completed = body?.completed === true;
  if (!isF90StepKey(stepKey)) {
    return NextResponse.json({ error: "Invalid step" }, { status: 400 });
  }

  const userId = guard.session.user.id;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { f90EnrolledAt: true, f90CompletedSteps: true },
  });
  if (!user?.f90EnrolledAt) {
    return NextResponse.json(
      { error: "Not enrolled in F90" },
      { status: 403 },
    );
  }

  const nextSteps = completed
    ? Array.from(new Set([...user.f90CompletedSteps, stepKey]))
    : user.f90CompletedSteps.filter((k) => k !== stepKey);

  const updated = await db.user.update({
    where: { id: userId },
    data: { f90CompletedSteps: nextSteps },
    select: { f90CompletedSteps: true },
  });

  return NextResponse.json({ completedSteps: updated.f90CompletedSteps });
}
