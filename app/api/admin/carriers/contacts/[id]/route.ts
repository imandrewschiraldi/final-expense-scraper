import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { label?: string; phone?: string };

  const label = body.label === undefined ? undefined : body.label.trim();
  if (body.label !== undefined && !label) {
    return NextResponse.json({ error: "Label is required" }, { status: 400 });
  }
  const phone = body.phone === undefined ? undefined : body.phone.trim();
  if (body.phone !== undefined && !phone) {
    return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
  }

  const contact = await db.carrierContact.update({
    where: { id },
    data: { ...(label ? { label } : {}), ...(phone ? { phone } : {}) },
  });

  return NextResponse.json({ contact });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  await db.carrierContact.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
