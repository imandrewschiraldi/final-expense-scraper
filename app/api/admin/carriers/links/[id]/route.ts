import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { label?: string; url?: string; isAgentPortal?: boolean };

  const label = body.label === undefined ? undefined : body.label.trim();
  if (body.label !== undefined && !label) {
    return NextResponse.json({ error: "Label is required" }, { status: 400 });
  }
  const url = body.url === undefined ? undefined : body.url.trim();
  if (body.url !== undefined && !url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  const link = await db.carrierLink.update({
    where: { id },
    data: {
      ...(label ? { label } : {}),
      ...(url ? { url } : {}),
      ...(body.isAgentPortal !== undefined ? { isAgentPortal: body.isAgentPortal } : {}),
    },
  });

  return NextResponse.json({ link });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  await db.carrierLink.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
