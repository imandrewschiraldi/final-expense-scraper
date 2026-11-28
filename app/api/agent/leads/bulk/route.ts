import { NextRequest, NextResponse } from "next/server";
import { requireAgent } from "@/lib/apiAuth";
import { db } from "@/lib/db";

type BulkAction =
  | { action: "addTag"; tag: string }
  | { action: "removeTag"; tag: string }
  | { action: "delete" }
  | { action: "createTask"; title: string; dueAt: string | null; description: string };

// The Contacts page's bulk action bar (checked rows -> Add Tag / Remove
// Tag / Delete / Create Bulk Task). Scoped the same way every other agent
// lead route is: only leads actually assigned to this agent, never a
// Vault lead they haven't claimed — bulk-editing someone else's shared
// pool lead isn't a thing this page offers.
export async function POST(req: NextRequest) {
  const guard = await requireAgent();
  if ("error" in guard) return guard.error;
  const agentId = guard.session.user.id;

  const body = await req.json().catch(() => null);
  const ids = Array.isArray(body?.ids)
    ? body.ids.filter((id: unknown): id is string => typeof id === "string")
    : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "No contacts selected" }, { status: 400 });
  }

  const action = body as BulkAction;
  const where = { id: { in: ids }, assignedAgentId: agentId };

  // Delete only ever touches leads this agent imported themselves, same
  // rule the single-lead DELETE route enforces — silently skips the rest
  // rather than erroring the whole batch.
  if (action.action === "delete") {
    const deletable = await db.lead.findMany({
      where: { ...where, sourceImport: { uploadedById: agentId } },
      select: { id: true },
    });
    const deletableIds = deletable.map((l) => l.id);
    if (deletableIds.length > 0) {
      await db.lead.deleteMany({ where: { id: { in: deletableIds } } });
    }
    return NextResponse.json({
      deleted: deletableIds.length,
      skipped: ids.length - deletableIds.length,
    });
  }

  if (action.action === "addTag" || action.action === "removeTag") {
    const tag = action.tag?.trim();
    if (!tag) return NextResponse.json({ error: "Tag is required" }, { status: 400 });
    const leads = await db.lead.findMany({ where, select: { id: true, tags: true } });
    await db.$transaction(
      leads.map((lead) =>
        db.lead.update({
          where: { id: lead.id },
          data: {
            tags:
              action.action === "addTag"
                ? Array.from(new Set([...lead.tags, tag]))
                : lead.tags.filter((t) => t !== tag),
          },
        }),
      ),
    );
    return NextResponse.json({ updated: leads.length });
  }

  if (action.action === "createTask") {
    const title = action.title?.trim();
    if (!title) return NextResponse.json({ error: "Task title is required" }, { status: 400 });
    const leads = await db.lead.findMany({ where, select: { id: true } });
    const dueAt = action.dueAt ? new Date(action.dueAt) : null;
    await db.leadTask.createMany({
      data: leads.map((lead) => ({
        leadId: lead.id,
        title,
        description: action.description?.trim() || null,
        dueAt,
        assignedToId: agentId,
        createdById: agentId,
      })),
    });
    return NextResponse.json({ created: leads.length });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
