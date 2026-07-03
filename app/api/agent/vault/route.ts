import { NextRequest, NextResponse } from "next/server";
import { requireAgent } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const guard = await requireAgent();
  if ("error" in guard) return guard.error;

  const { searchParams } = new URL(req.url);
  const state = searchParams.get("state");
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));

  // The vault is intentionally open to every agent regardless of licensed
  // states — state here is just a convenience filter, not an access rule.
  const where: Prisma.LeadWhereInput = { isVaulted: true };
  if (state) where.state = state;

  const [leads, total] = await Promise.all([
    db.lead.findMany({
      where,
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.lead.count({ where }),
  ]);

  return NextResponse.json({ leads, total, page, pageSize: PAGE_SIZE });
}
