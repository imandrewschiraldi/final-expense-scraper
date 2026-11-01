import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { OVERVIEW_WIDGET_REGISTRY } from "@/lib/overviewWidgets";

const KNOWN_IDS = new Set(OVERVIEW_WIDGET_REGISTRY.map((w) => w.id));

/** Writes for the Overview page's drag-and-drop widget layout — reads come
 *  from GET /api/portal/overview's own `layout` field instead of a separate
 *  endpoint, since every viewer already fetches that on page load. */
export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const body = await req.json().catch(() => null);

  // Full reorder: every known widget id, in the desired order. Unlisted
  // ids keep whatever order they already had.
  if (Array.isArray(body?.reorder)) {
    const ids = body.reorder.filter((id: unknown): id is string => typeof id === "string" && KNOWN_IDS.has(id));
    await db.$transaction(
      ids.map((id: string, index: number) =>
        db.overviewWidget.upsert({
          where: { id },
          update: { order: index },
          create: { id, order: index },
        }),
      ),
    );
    return NextResponse.json({ ok: true });
  }

  // Single-widget show/hide toggle.
  const id = typeof body?.id === "string" ? body.id : null;
  if (!id || !KNOWN_IDS.has(id)) return NextResponse.json({ error: "Unknown widget id." }, { status: 400 });
  if (typeof body?.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled must be a boolean." }, { status: 400 });
  }

  const defaultOrder = OVERVIEW_WIDGET_REGISTRY.findIndex((w) => w.id === id);
  await db.overviewWidget.upsert({
    where: { id },
    update: { enabled: body.enabled },
    create: { id, enabled: body.enabled, order: defaultOrder },
  });
  return NextResponse.json({ ok: true });
}
