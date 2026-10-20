import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { name?: string; url?: string; description?: string };

  const name = body.name === undefined ? undefined : body.name.trim();
  if (body.name !== undefined && !name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const url = body.url === undefined ? undefined : body.url.trim();
  if (body.url !== undefined && !url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  const vendor = await db.leadVendor.update({
    where: { id },
    data: {
      ...(name ? { name } : {}),
      ...(url ? { url } : {}),
      ...(body.description !== undefined ? { description: body.description.trim() || null } : {}),
    },
  });

  return NextResponse.json({ vendor });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  await db.leadVendor.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
