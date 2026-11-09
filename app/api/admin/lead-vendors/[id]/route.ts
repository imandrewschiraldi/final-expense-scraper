import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";

const MAX_NAME = 120;
const MAX_DESCRIPTION = 500;
const MAX_BULLETS = 10;
const MAX_BULLET_LENGTH = 300;

function parseBullets(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((b): b is string => typeof b === "string")
    .map((b) => b.trim())
    .filter(Boolean)
    .slice(0, MAX_BULLETS)
    .map((b) => b.slice(0, MAX_BULLET_LENGTH));
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const body = await req.json().catch(() => null);

  const data: {
    name?: string;
    description?: string | null;
    bullets?: string[];
    url?: string;
    logoUrl?: string;
    logoOnLight?: boolean;
  } = {};

  if (typeof body?.name === "string") {
    const name = body.name.trim().slice(0, MAX_NAME);
    if (!name)
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    data.name = name;
  }
  if (typeof body?.description === "string") {
    data.description =
      body.description.trim().slice(0, MAX_DESCRIPTION) || null;
  }
  if (Array.isArray(body?.bullets)) {
    data.bullets = parseBullets(body.bullets);
  }
  if (typeof body?.url === "string") {
    const url = body.url.trim();
    if (!url)
      return NextResponse.json(
        { error: "A URL is required." },
        { status: 400 },
      );
    data.url = url;
  }
  if (typeof body?.logoUrl === "string") {
    const logoUrl = body.logoUrl.trim();
    if (!logoUrl)
      return NextResponse.json(
        { error: "A logo is required." },
        { status: 400 },
      );
    data.logoUrl = logoUrl;
  }
  if (typeof body?.logoOnLight === "boolean") {
    data.logoOnLight = body.logoOnLight;
  }

  const vendor = await db.leadVendor.update({ where: { id }, data });
  return NextResponse.json({ vendor });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  await db.leadVendor.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
