import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

/** Creates a labeled link button under a carrier (Agent Portal, a quoting tool, a guide, anything else). Appended to the end of the existing order. */
export async function POST(req: NextRequest, { params }: Params) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id: carrierId } = await params;
  const body = (await req.json().catch(() => ({}))) as { label?: string; url?: string; isAgentPortal?: boolean };
  const label = body.label?.trim();
  const url = body.url?.trim();

  if (!label) return NextResponse.json({ error: "Label is required" }, { status: 400 });
  if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });

  const carrier = await db.carrier.findUnique({ where: { id: carrierId } });
  if (!carrier) return NextResponse.json({ error: "Carrier not found" }, { status: 404 });

  const last = await db.carrierLink.findFirst({ where: { carrierId }, orderBy: { order: "desc" } });
  const link = await db.carrierLink.create({
    data: { carrierId, label, url, isAgentPortal: body.isAgentPortal === true, order: (last?.order ?? -1) + 1 },
  });

  return NextResponse.json({ link }, { status: 201 });
}
