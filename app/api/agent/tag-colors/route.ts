import { NextRequest, NextResponse } from "next/server";
import { requireAgent } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { SUGGESTED_TAGS } from "@/lib/suggestedTags";

// A rotating palette assigned to brand-new tag names — picked by hashing the
// name so the same not-yet-colored tag always lands on the same color
// before its row exists, and stays stable once it does.
const PALETTE = [
  "#C97A3D", // copper
  "#4F9C8C", // teal
  "#D9A441", // gold
  "#6B9C4F", // green
  "#B9324A", // red
  "#7A6BC9", // violet
  "#4F8FC9", // blue
  "#C96B9C", // pink
];

export function colorForTagName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

// Lists every known tag color (GET) so the Contacts table can render colored
// pills, and upserts one (POST) when an agent types a brand-new tag name
// into the Add/Edit Contact form's tags combobox — this is a global lookup
// (see TagColor's own doc comment), not scoped per agent, since a tag name
// should look the same everywhere it appears.
//
// GET also self-seeds the agency's standard suggested-tag vocabulary
// (lib/suggestedTags.ts) with its deliberately-chosen semantic colors —
// skipDuplicates makes this a no-op once seeded, and it stays self-healing
// if more suggested tags are added to that list later.
export async function GET() {
  const guard = await requireAgent();
  if ("error" in guard) return guard.error;
  await db.tagColor.createMany({
    data: SUGGESTED_TAGS.map((t) => ({ name: t.key, color: t.color })),
    skipDuplicates: true,
  });
  const colors = await db.tagColor.findMany();
  return NextResponse.json({ colors });
}

export async function POST(req: NextRequest) {
  const guard = await requireAgent();
  if ("error" in guard) return guard.error;

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Tag name is required" }, { status: 400 });

  const color = await db.tagColor.upsert({
    where: { name },
    update: {},
    create: { name, color: colorForTagName(name) },
  });

  return NextResponse.json({ color });
}
