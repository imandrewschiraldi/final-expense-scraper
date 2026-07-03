import { NextRequest, NextResponse } from "next/server";
import { requireAgent } from "@/lib/apiAuth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAgent();
  if ("error" in guard) return guard.error;

  const { id } = await params;
  const body = await req.json();
  const { body: noteBody } = body as { body?: string };

  if (!noteBody || !noteBody.trim()) {
    return NextResponse.json({ error: "Note body is required" }, { status: 400 });
  }

  const lead = await db.lead.findFirst({
    where: { id, OR: [{ assignedAgentId: guard.session.user.id }, { isVaulted: true }] },
  });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const note = await db.leadNote.create({
    data: { leadId: id, authorId: guard.session.user.id, body: noteBody.trim() },
    include: { author: { select: { name: true } } },
  });

  return NextResponse.json({ note }, { status: 201 });
}
