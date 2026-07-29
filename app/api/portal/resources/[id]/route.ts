import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const resource = await db.resource.findUnique({ where: { id } });
  if (!resource) {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }

  await db.resource.delete({ where: { id } });

  // Best-effort — don't fail the request if the blob's already gone.
  await del(resource.fileUrl).catch(() => {});

  return NextResponse.json({ deleted: true });
}
