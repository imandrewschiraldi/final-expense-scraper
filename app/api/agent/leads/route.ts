import { NextRequest, NextResponse } from "next/server";
import { requireAgent } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { buildAgentLeadsWhere, AGENT_LEADS_ORDER_BY } from "@/lib/agentLeads";
import { isLeadType } from "@/lib/leadType";
import { generateUniqueLeadNumbers } from "@/lib/leadNumber";
import { stageIdForSystemKey } from "@/lib/pipelineSync";

export async function GET(req: NextRequest) {
  const guard = await requireAgent();
  if ("error" in guard) return guard.error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const archived = searchParams.get("archived") === "true";
  const state = searchParams.get("state");
  const q = searchParams.get("q");

  const leads = await db.lead.findMany({
    where: buildAgentLeadsWhere(guard.session.user.id, {
      status,
      archived,
      state,
      q,
    }),
    orderBy: AGENT_LEADS_ORDER_BY,
    // A contact search only needs enough to list and pick a result —
    // capped so a broad query (e.g. a common first name) can't return an
    // unbounded list.
    take: q ? 20 : undefined,
  });

  return NextResponse.json({ leads });
}

// A single manual lead entry — distinct from the CSV import flow. Not
// currently wired to any button (Book of Business's "+ Add Opportunity"
// now searches existing contacts instead of creating new ones — see
// AddOpportunityForm), kept as a general-purpose way to create one lead
// directly.
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
  const state =
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
  if (!state)
    return NextResponse.json({ error: "State is required" }, { status: 400 });
  if (!isLeadType(leadType)) {
    return NextResponse.json(
      { error: "A valid lead type is required" },
      { status: 400 },
    );
  }

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
    },
  });

  return NextResponse.json({ lead }, { status: 201 });
}
