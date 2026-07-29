import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { saveDashboardLayout } from "@/lib/dashboardLayout";
import type { Widget } from "@/lib/dashboardLayout";

export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const body = await req.json();
  const { widgets } = body as { widgets?: Widget[] };

  if (!Array.isArray(widgets)) {
    return NextResponse.json({ error: "widgets must be an array" }, { status: 400 });
  }

  const layout = await saveDashboardLayout(widgets, guard.session.user.id);
  return NextResponse.json({ widgets: layout.widgets });
}
