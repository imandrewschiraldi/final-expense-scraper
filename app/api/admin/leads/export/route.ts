import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { format } from "date-fns";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, LeadStatus } from "@/lib/leadStatus";
import { LEAD_TYPE_LABELS, isLeadType } from "@/lib/leadType";
import { formatPhone } from "@/lib/formatPhone";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { searchParams } = new URL(req.url);
  const state = searchParams.get("state");
  const status = searchParams.get("status") as LeadStatus | null;
  const leadType = searchParams.get("leadType");
  const agentId = searchParams.get("agentId");
  const unassignedOnly = searchParams.get("unassignedOnly") === "true";
  const archivedParam = searchParams.get("archived");
  const isVaultedParam = searchParams.get("isVaulted");
  const vaultOriginParam = searchParams.get("vaultOrigin");

  const where: Prisma.LeadWhereInput = archivedParam === "any" ? {} : { isArchived: archivedParam === "true" };

  if (state) where.state = state;
  if (status && LEAD_STATUSES.includes(status)) where.status = status;
  if (leadType && isLeadType(leadType)) where.leadType = leadType;
  if (unassignedOnly) where.assignedAgentId = null;
  else if (agentId) where.assignedAgentId = agentId;
  if (isVaultedParam === "true" || isVaultedParam === "false") where.isVaulted = isVaultedParam === "true";
  if (vaultOriginParam === "true" || vaultOriginParam === "false") where.vaultOrigin = vaultOriginParam === "true";

  const leads = await db.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { assignedAgent: { select: { name: true } } },
  });

  const csv = Papa.unparse(
    leads.map((lead) => ({
      "First Name": lead.firstName,
      "Last Name": lead.lastName,
      Phone: formatPhone(lead.phone),
      State: lead.state,
      "Date of Birth": format(lead.dateOfBirth, "MM/dd/yyyy"),
      "Lead Type": LEAD_TYPE_LABELS[lead.leadType],
      Status: LEAD_STATUS_LABELS[lead.status],
      "Assigned Agent": lead.assignedAgent?.name ?? "Unassigned",
      Vault: lead.isVaulted ? "Yes" : "No",
      Archived: lead.isArchived ? "Yes" : "No",
    })),
  );

  const filename = `leads${state ? `-${state}` : ""}${unassignedOnly ? "-unassigned" : ""}-${format(new Date(), "yyyy-MM-dd")}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
