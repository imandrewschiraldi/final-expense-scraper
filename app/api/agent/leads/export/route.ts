import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { format } from "date-fns";
import { requireAgent } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { buildAgentLeadsWhere, AGENT_LEADS_ORDER_BY } from "@/lib/agentLeads";
import { LEAD_STATUS_LABELS } from "@/lib/leadStatus";
import { formatPhone } from "@/lib/formatPhone";

export async function GET(req: NextRequest) {
  const guard = await requireAgent();
  if ("error" in guard) return guard.error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const archived = searchParams.get("archived") === "true";

  const leads = await db.lead.findMany({
    where: buildAgentLeadsWhere(guard.session.user.id, { status, archived }),
    orderBy: AGENT_LEADS_ORDER_BY,
  });

  const csv = Papa.unparse(
    leads.map((lead) => ({
      "First Name": lead.firstName,
      "Last Name": lead.lastName,
      Phone: formatPhone(lead.phone),
      State: lead.state,
      "Date of Birth": format(lead.dateOfBirth, "MM/dd/yyyy"),
      Status: LEAD_STATUS_LABELS[lead.status],
      "Assigned At": lead.assignedAt ? format(lead.assignedAt, "MM/dd/yyyy") : "",
    })),
  );

  const filename = `leads-${format(new Date(), "yyyy-MM-dd")}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
