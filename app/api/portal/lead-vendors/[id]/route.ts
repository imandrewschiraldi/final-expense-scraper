import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { name, website, contactInfo, notes } = body as {
    name?: string;
    website?: string;
    contactInfo?: string;
    notes?: string;
  };

  const vendor = await db.leadVendor.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(website !== undefined ? { website: website.trim() || null } : {}),
      ...(contactInfo !== undefined ? { contactInfo: contactInfo.trim() || null } : {}),
      ...(notes !== undefined ? { notes: notes.trim() || null } : {}),
    },
  });

  return NextResponse.json({ vendor });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  await db.leadVendor.delete({ where: { id } });

  return NextResponse.json({ deleted: true });
}
