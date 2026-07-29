import { db } from "@/lib/db";
import { DEFAULT_WIDGETS, Widget } from "@/lib/dashboardLayoutShared";

export * from "@/lib/dashboardLayoutShared";

export async function getDashboardLayout(): Promise<Widget[]> {
  const row = await db.dashboardLayout.findFirst({ orderBy: { updatedAt: "desc" } });
  if (!row) return DEFAULT_WIDGETS;
  return row.widgets as unknown as Widget[];
}

export async function saveDashboardLayout(widgets: Widget[], updatedById: string) {
  const existing = await db.dashboardLayout.findFirst({ orderBy: { updatedAt: "desc" } });
  if (existing) {
    return db.dashboardLayout.update({
      where: { id: existing.id },
      data: { widgets: widgets as unknown as object, updatedById },
    });
  }
  return db.dashboardLayout.create({
    data: { widgets: widgets as unknown as object, updatedById },
  });
}
