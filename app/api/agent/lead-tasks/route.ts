import { NextRequest, NextResponse } from "next/server";
import { requireAgent } from "@/lib/apiAuth";
import { db } from "@/lib/db";

// The page-level "Tasks" tab on the Contacts page — every open task across
// every lead assigned to this agent (callbacks, follow-ups), not scoped to
// one contact. A lead's own detail drawer instead passes ?leadId= to get
// just that one contact's tasks.
export async function GET(req: NextRequest) {
  const guard = await requireAgent();
  if ("error" in guard) return guard.error;
  const agentId = guard.session.user.id;

  const { searchParams } = new URL(req.url);
  const leadId = searchParams.get("leadId");
  const includeCompleted = searchParams.get("includeCompleted") === "true";

  const tasks = await db.leadTask.findMany({
    where: {
      ...(leadId
        ? { leadId }
        : { lead: { assignedAgentId: agentId } }),
      ...(includeCompleted ? {} : { completed: false }),
    },
    include: {
      lead: { select: { id: true, firstName: true, lastName: true, phone: true } },
      assignedTo: { select: { id: true, name: true } },
    },
    orderBy: [{ completed: "asc" }, { dueAt: "asc" }],
  });

  return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest) {
  const guard = await requireAgent();
  if ("error" in guard) return guard.error;
  const agentId = guard.session.user.id;

  const body = await req.json().catch(() => null);
  const leadId = typeof body?.leadId === "string" ? body.leadId : "";
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const dueAt = typeof body?.dueAt === "string" && body.dueAt ? new Date(body.dueAt) : null;
  const assignedToId = typeof body?.assignedToId === "string" ? body.assignedToId : agentId;

  if (!leadId) return NextResponse.json({ error: "leadId is required" }, { status: 400 });
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const lead = await db.lead.findFirst({ where: { id: leadId, assignedAgentId: agentId } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const task = await db.leadTask.create({
    data: {
      leadId,
      title,
      description: description || null,
      dueAt,
      assignedToId,
      createdById: agentId,
    },
    include: {
      lead: { select: { id: true, firstName: true, lastName: true, phone: true } },
      assignedTo: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json({ task }, { status: 201 });
}
