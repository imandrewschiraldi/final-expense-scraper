import { NextRequest, NextResponse } from "next/server";
import { Prisma, PhoneType } from "@prisma/client";
import { requireAgent } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { buildAgentLeadsWhere, AGENT_LEADS_ORDER_BY } from "@/lib/agentLeads";
import { filterGroupToWhere, type FilterGroup } from "@/lib/contactFilters";
import { isLeadType } from "@/lib/leadType";
import { generateUniqueLeadNumbers } from "@/lib/leadNumber";
import { stageIdForSystemKey, getStageTarget } from "@/lib/pipelineSync";
import { colorForTagName } from "@/app/api/agent/tag-colors/route";

export async function GET(req: NextRequest) {
  const guard = await requireAgent();
  if ("error" in guard) return guard.error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const pipelineStageId = searchParams.get("pipelineStageId");
  const archived = searchParams.get("archived") === "true";
  const state = searchParams.get("state");
  const q = searchParams.get("q");
  const tags = searchParams.get("tags")?.split(",").filter(Boolean) ?? null;
  const source = searchParams.get("source");
  // Contacts page pagination — "limit" alone (no "paginate" flag) means a
  // plain contact-search caller, which keeps its existing capped-at-20,
  // no-total-count behavior untouched.
  const paginate = searchParams.get("paginate") === "true";
  // Count-only mode — the Filters Drawer's live "Showing N matching
  // contacts" readout and the table's "Select all N matching this filter"
  // banner both just need the count, not a page of rows.
  const countOnly = searchParams.get("countOnly") === "true";
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 20, 1), 100);
  const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);
  const sortKey = searchParams.get("sortKey");
  const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

  let pipelineStageSystemKey: string | null = null;
  if (pipelineStageId) {
    const target = await getStageTarget(pipelineStageId);
    if (!target || target.phase !== "LEAD") {
      return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
    }
    pipelineStageSystemKey = target.systemKey;
  }

  const baseWhere = buildAgentLeadsWhere(guard.session.user.id, {
    status,
    pipelineStageId,
    pipelineStageSystemKey,
    archived,
    state,
    q,
    tags,
    source,
  });

  // The Contacts page's "More Filters" drawer — a JSON-encoded FilterGroup
  // merged onto the base where above (not replacing it), so a filter-drawer
  // condition narrows the already-tab/search-filtered set rather than
  // bypassing it.
  const filtersParam = searchParams.get("filters");
  let filterGroup: FilterGroup | null = null;
  if (filtersParam) {
    try {
      filterGroup = JSON.parse(filtersParam);
    } catch {
      return NextResponse.json({ error: "Invalid filters" }, { status: 400 });
    }
  }
  const extraWhere = filterGroupToWhere(filterGroup);
  const where: Prisma.LeadWhereInput = extraWhere ? { AND: [baseWhere, extraWhere] } : baseWhere;

  if (countOnly) {
    const total = await db.lead.count({ where });
    return NextResponse.json({ total });
  }

  // Only a few columns are meaningfully sortable server-side — "Last
  // Activity" has no single DB column of its own (it's synthesized
  // client-side from contact log entries), so it isn't included here and
  // falls back to the default order below instead of erroring.
  const SORTABLE_FIELDS: Record<string, string> = {
    name: "firstName",
    created: "createdAt",
    lastActivity: "updatedAt",
    status: "status",
    phone: "phone",
    email: "email",
    age: "age",
  };
  const sortField = sortKey ? SORTABLE_FIELDS[sortKey] : undefined;
  // Nulls always sort last regardless of direction — matters for the
  // nullable columns above (email, age); harmless no-op on the rest.
  const orderBy: Prisma.LeadOrderByWithRelationInput = sortField
    ? { [sortField]: { sort: sortDir, nulls: "last" } }
    : AGENT_LEADS_ORDER_BY;

  if (!paginate) {
    const leads = await db.lead.findMany({
      where,
      include: { pipelineStage: { select: { name: true, systemKey: true } } },
      orderBy,
      // A contact search only needs enough to list and pick a result —
      // capped so a broad query (e.g. a common first name) can't return an
      // unbounded list.
      take: q ? 20 : undefined,
    });
    return NextResponse.json({ leads });
  }

  const [leads, total] = await Promise.all([
    db.lead.findMany({
      where,
      include: {
        pipelineStage: { select: { id: true, name: true, systemKey: true } },
        tasks: {
          where: { completed: false },
          orderBy: { dueAt: "asc" },
          select: { dueAt: true },
        },
      },
      orderBy,
      skip: offset,
      take: limit,
    }),
    db.lead.count({ where }),
  ]);

  // Flattens each lead's open-task list into the two fields the Contacts
  // table actually renders, so the client doesn't need its own copy of
  // this "soonest due, or null" logic.
  const contacts = leads.map((lead) => ({
    ...lead,
    openTaskCount: lead.tasks.length,
    nextTaskDueAt: lead.tasks[0]?.dueAt ?? null,
    tasks: undefined,
  }));

  return NextResponse.json({ leads: contacts, total });
}

// A single manual lead entry — the Contacts page's "Add Contact" modal,
// plus a general-purpose way to create one lead directly (Book of
// Business's "+ Add Opportunity" instead searches existing contacts
// rather than creating new ones — see AddOpportunityForm).
export async function POST(req: NextRequest) {
  const guard = await requireAgent();
  if ("error" in guard) return guard.error;

  const body = await req.json().catch(() => null);
  const firstName =
    typeof body?.firstName === "string" ? body.firstName.trim() : "";
  const lastName =
    typeof body?.lastName === "string" ? body.lastName.trim() : "";
  const phone =
    typeof body?.phone === "string" ? body.phone.replace(/[^\d+]/g, "") : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const city = typeof body?.city === "string" ? body.city.trim() : "";
  const zip = typeof body?.zip === "string" ? body.zip.trim() : "";
  const source = typeof body?.source === "string" ? body.source.trim() : "";
  const tags = Array.isArray(body?.tags)
    ? body.tags.filter((t: unknown): t is string => typeof t === "string" && t.trim().length > 0)
    : [];
  const dndAll = body?.dndAll === true;
  const secondaryEmails: string[] = Array.isArray(body?.secondaryEmails)
    ? body.secondaryEmails.filter((v: unknown): v is string => typeof v === "string" && v.trim().length > 0)
    : [];
  const secondaryPhones: { value: string; type?: string; countryCode?: string }[] = Array.isArray(
    body?.secondaryPhones,
  )
    ? body.secondaryPhones.filter((p: unknown): p is { value: string } => !!(p as { value?: string })?.value?.trim())
    : [];
  let state =
    typeof body?.state === "string" ? body.state.trim().toUpperCase() : "";
  const leadType = body?.leadType;
  const dateOfBirth =
    typeof body?.dateOfBirth === "string" ? body.dateOfBirth.trim() : "";

  if (!firstName)
    return NextResponse.json(
      { error: "First name is required" },
      { status: 400 },
    );
  if (phone.length < 10) {
    return NextResponse.json(
      { error: "A valid phone number is required" },
      { status: 400 },
    );
  }
  if (!isLeadType(leadType)) {
    return NextResponse.json(
      { error: "A valid lead type is required" },
      { status: 400 },
    );
  }

  // Falls back to the agent's own primary licensed state when the form
  // leaves it blank — `state` is a required column (every lead needs one
  // for licensing/compliance filtering elsewhere), but the agent's own
  // contacts overwhelmingly share that one state, so defaulting it removes
  // a redundant field from the common case instead of rejecting the save.
  if (!state) {
    const agent = await db.user.findUnique({
      where: { id: guard.session.user.id },
      select: { licensedStates: true },
    });
    state = agent?.licensedStates[0] ?? "";
  }
  if (!state)
    return NextResponse.json({ error: "State is required" }, { status: 400 });

  let parsedDob: Date | null = null;
  if (dateOfBirth) {
    const parsed = new Date(dateOfBirth);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json(
        { error: "Invalid date of birth" },
        { status: 400 },
      );
    }
    parsedDob = parsed;
  }

  const [leadNumber] = await generateUniqueLeadNumbers(1);
  const pipelineStageId = await stageIdForSystemKey("LEAD", "NEW");
  const agentId = guard.session.user.id;

  const lead = await db.lead.create({
    data: {
      firstName,
      lastName,
      phone,
      state,
      leadType,
      dateOfBirth: parsedDob,
      leadNumber,
      pipelineStageId,
      assignedAgentId: agentId,
      assignedAt: new Date(),
      email: email || null,
      city: city || null,
      zip: zip || null,
      source: source || null,
      tags,
      dndAll,
      secondaryEmails: secondaryEmails.length
        ? { createMany: { data: secondaryEmails.map((value) => ({ value: value.trim() })) } }
        : undefined,
      secondaryPhones: secondaryPhones.length
        ? {
            createMany: {
              data: secondaryPhones.map((p) => ({
                value: p.value.replace(/[^\d+]/g, ""),
                type: (Object.values(PhoneType) as string[]).includes(p.type ?? "")
                  ? (p.type as PhoneType)
                  : PhoneType.MOBILE,
                countryCode: p.countryCode || "+1",
              })),
            },
          }
        : undefined,
    },
    include: { secondaryEmails: true, secondaryPhones: true },
  });

  if (tags.length > 0) {
    await db.tagColor.createMany({
      data: tags.map((name: string) => ({ name, color: colorForTagName(name) })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json({ lead }, { status: 201 });
}
