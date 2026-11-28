import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAgent } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { buildAgentLeadsWhere } from "@/lib/agentLeads";
import { filterGroupToWhere, type FilterGroup } from "@/lib/contactFilters";

type BulkAction =
  | { action: "addTag"; tag: string }
  | { action: "removeTag"; tag: string }
  | { action: "delete" }
  | { action: "createTask"; title: string; dueAt: string | null; description: string };

// Either an explicit set of ids (the normal "N selected" case), or
// "every contact matching the current Contacts page filters" (the
// "Select all 1,284 contacts in this Smart List" banner) minus whatever the
// agent has since unchecked — resolved synchronously against the same
// where-clause builder the GET route uses, rather than a background job
// queue: this app's whole bulk-action surface is already synchronous
// transactions, and an agent's own book of leads never approaches a size
// where that stops being instant.
type Selection =
  | { ids: string[] }
  | {
      selectAllMatching: true;
      archived?: boolean;
      state?: string | null;
      q?: string | null;
      tags?: string[] | null;
      source?: string | null;
      filters?: FilterGroup | null;
      excludedIds?: string[];
    };

async function resolveIds(agentId: string, body: Record<string, unknown>): Promise<string[]> {
  if (Array.isArray(body.ids)) {
    return body.ids.filter((id): id is string => typeof id === "string");
  }
  if (body.selectAllMatching !== true) return [];

  const selection = body as Extract<Selection, { selectAllMatching: true }>;
  const baseWhere = buildAgentLeadsWhere(agentId, {
    status: null,
    pipelineStageId: null,
    pipelineStageSystemKey: null,
    archived: selection.archived ?? false,
    state: selection.state ?? null,
    q: selection.q ?? null,
    tags: selection.tags ?? null,
    source: selection.source ?? null,
  });
  const extraWhere = filterGroupToWhere(selection.filters ?? null);
  const where: Prisma.LeadWhereInput = extraWhere ? { AND: [baseWhere, extraWhere] } : baseWhere;
  const excluded = new Set(selection.excludedIds ?? []);

  const matches = await db.lead.findMany({ where, select: { id: true } });
  return matches.map((l) => l.id).filter((id) => !excluded.has(id));
}

// The Contacts page's bulk action bar (checked rows -> Add Tag / Remove
// Tag / Delete / Create Bulk Task). Scoped the same way every other agent
// lead route is: only leads actually assigned to this agent, never a
// Vault lead they haven't claimed — bulk-editing someone else's shared
// pool lead isn't a thing this page offers.
export async function POST(req: NextRequest) {
  const guard = await requireAgent();
  if ("error" in guard) return guard.error;
  const agentId = guard.session.user.id;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const ids = await resolveIds(agentId, body);
  if (ids.length === 0) {
    return NextResponse.json({ error: "No contacts selected" }, { status: 400 });
  }

  const action = body as unknown as BulkAction;
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
    if (action.action === "addTag") {
      const { colorForTagName } = await import("@/app/api/agent/tag-colors/route");
      await db.tagColor.upsert({
        where: { name: tag },
        update: {},
        create: { name: tag, color: colorForTagName(tag) },
      });
    }
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
