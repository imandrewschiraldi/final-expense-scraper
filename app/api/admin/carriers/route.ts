import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";

export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const carriers = await db.carrier.findMany({
    orderBy: { name: "asc" },
    include: { plans: { orderBy: { name: "asc" } } },
  });

  return NextResponse.json({ carriers });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { name } = (await req.json().catch(() => ({}))) as { name?: string };
  const cleaned = name?.trim();
  if (!cleaned) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const existing = await db.carrier.findUnique({ where: { name: cleaned } });
  if (existing) return NextResponse.json({ error: "A carrier with that name already exists" }, { status: 409 });

  const carrier = await db.carrier.create({ data: { name: cleaned } });
  return NextResponse.json({ carrier: { ...carrier, plans: [] } }, { status: 201 });
}
