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

export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const vendors = await db.leadVendor.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json({ vendors });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const body = await req.json().catch(() => null);
  const name =
    typeof body?.name === "string" ? body.name.trim().slice(0, MAX_NAME) : "";
  const description =
    typeof body?.description === "string"
      ? body.description.trim().slice(0, MAX_DESCRIPTION)
      : "";
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  const logoUrl = typeof body?.logoUrl === "string" ? body.logoUrl.trim() : "";
  const logoOnLight = body?.logoOnLight === true;
  const bullets = parseBullets(body?.bullets);

  if (!name)
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (!url)
    return NextResponse.json({ error: "A URL is required." }, { status: 400 });
  if (!logoUrl)
    return NextResponse.json({ error: "A logo is required." }, { status: 400 });

  const last = await db.leadVendor.findFirst({
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const vendor = await db.leadVendor.create({
    data: {
      name,
      description: description || null,
      bullets,
      url,
      logoUrl,
      logoOnLight,
      order: (last?.order ?? -1) + 1,
    },
  });

  return NextResponse.json({ vendor });
}

export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const body = await req.json().catch(() => null);
  const ids = Array.isArray(body?.reorder)
    ? body.reorder.filter((id: unknown): id is string => typeof id === "string")
    : null;
  if (!ids) {
    return NextResponse.json(
      { error: "reorder must be an array of ids." },
      { status: 400 },
    );
  }

  await db.$transaction(
    ids.map((id: string, index: number) =>
      db.leadVendor.update({ where: { id }, data: { order: index } }),
    ),
  );
  return NextResponse.json({ ok: true });
}
