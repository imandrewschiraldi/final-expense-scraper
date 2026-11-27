import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { format } from "date-fns";
import { requireAgent } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { buildAgentLeadsWhere, AGENT_LEADS_ORDER_BY } from "@/lib/agentLeads";
import { LEAD_STATUS_LABELS } from "@/lib/leadStatus";
import { LEAD_TYPE_LABELS } from "@/lib/leadType";
import { getStageTarget } from "@/lib/pipelineSync";
import { formatPhone } from "@/lib/formatPhone";
import { formatDob } from "@/lib/formatDob";

export async function GET(req: NextRequest) {
  const guard = await requireAgent();
  if ("error" in guard) return guard.error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const pipelineStageId = searchParams.get("pipelineStageId");
  const archived = searchParams.get("archived") === "true";
  const state = searchParams.get("state");

  let pipelineStageSystemKey: string | null = null;
  if (pipelineStageId) {
    const target = await getStageTarget(pipelineStageId);
    if (!target || target.phase !== "LEAD") {
      return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
    }
    pipelineStageSystemKey = target.systemKey;
  }

  const leads = await db.lead.findMany({
    where: buildAgentLeadsWhere(guard.session.user.id, {
      status,
      pipelineStageId,
      pipelineStageSystemKey,
      archived,
      state,
    }),
    include: { pipelineStage: { select: { name: true } } },
    orderBy: AGENT_LEADS_ORDER_BY,
  });

  const csv = Papa.unparse(
    leads.map((lead) => ({
      "Lead Number": lead.leadNumber ?? "",
      "Date Added": format(lead.createdAt, "MM/dd/yyyy"),
      "First Name": lead.firstName,
      "Last Name": lead.lastName,
      Phone: formatPhone(lead.phone),
      State: lead.state,
      "Date of Birth": formatDob(lead.dateOfBirth),
      "Lead Type": LEAD_TYPE_LABELS[lead.leadType],
      Status: lead.pipelineStage?.name ?? LEAD_STATUS_LABELS[lead.status],
      "Assigned At": lead.assignedAt
        ? format(lead.assignedAt, "MM/dd/yyyy")
        : "",
      Email: lead.email ?? "",
      Address: lead.address ?? "",
      Zip: lead.zip ?? "",
      County: lead.county ?? "",
      Beneficiary: lead.beneficiary ?? "",
      "Beneficiary Relationship": lead.beneficiaryRelationship ?? "",
      Gender: lead.gender ?? "",
      "Marital Status": lead.maritalStatus ?? "",
      Height: lead.height ?? "",
      Weight: lead.weight ?? "",
      "Tobacco Use":
        lead.tobaccoUse == null ? "" : lead.tobaccoUse ? "Yes" : "No",
      Occupation: lead.occupation ?? "",
      Income: lead.income ?? "",
      "Existing Coverage": lead.existingCoverage ?? "",
      "Coverage Requested": lead.coverageAmountRequested ?? "",
      "Military Branch": lead.militaryBranch ?? "",
      "Source Notes": lead.vendorNotes ?? "",
    })),
  );

  const filename = `leads${state ? `-${state}` : ""}-${format(new Date(), "yyyy-MM-dd")}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
