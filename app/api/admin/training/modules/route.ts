import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";

export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const modules = await db.trainingModule.findMany({
    orderBy: { order: "asc" },
    include: { lessons: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ modules });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const body = await req.json();
  const { title, description } = body as { title?: string; description?: string };

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const maxOrder = await db.trainingModule.aggregate({ _max: { order: true } });

  const module_ = await db.trainingModule.create({
    data: {
      title,
      description: description ?? null,
      order: (maxOrder._max.order ?? 0) + 1,
    },
    include: { lessons: true },
  });

  return NextResponse.json({ module: module_ }, { status: 201 });
}
