import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { isF90StepKey } from "@/lib/f90Content";

function cleanString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function cleanLinks(value: unknown): { label: string; href: string | null }[] | null {
  if (!Array.isArray(value)) return null;
  const out = value
    .filter((l): l is { label: unknown; href: unknown } => !!l && typeof l === "object")
    .map((l) => ({ label: cleanString(l.label), href: cleanString(l.href) }))
    .filter((l): l is { label: string; href: string | null } => l.label !== null);
  return out.length > 0 ? out : null;
}

// Admin edit to one F90 mission — title/description/videoUrl/links each
// replace that field's code default in lib/f90Content.ts's F90_PHASES,
// visible to every agent on the F90 tab. A field left out of the request
// body is left untouched; sending it as "" (or, for links, []) clears that
// one field back to the code default without resetting the others.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ stepKey: string }> },
) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { stepKey } = await params;
  if (!isF90StepKey(stepKey)) {
    return NextResponse.json({ error: "Unknown F90 mission." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const data: {
    title?: string | null;
    description?: string | null;
    videoUrl?: string | null;
    links?: Prisma.InputJsonValue | typeof Prisma.DbNull;
  } = {};
  if ("title" in body) data.title = cleanString(body.title);
  if ("description" in body) data.description = cleanString(body.description);
  if ("videoUrl" in body) data.videoUrl = cleanString(body.videoUrl);
  if ("links" in body) {
    const links = cleanLinks(body.links);
    data.links = links === null ? Prisma.DbNull : links;
  }

  const row = await db.f90StepContent.upsert({
    where: { stepKey },
    create: { stepKey, ...data },
    update: data,
  });
  return NextResponse.json({ content: row });
}

// Clears every override for one mission, back to its lib/f90Content.ts
// default — the Admin panel's "Reset to Default" button.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ stepKey: string }> },
) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { stepKey } = await params;
  await db.f90StepContent.deleteMany({ where: { stepKey } });
  return NextResponse.json({ ok: true });
}
