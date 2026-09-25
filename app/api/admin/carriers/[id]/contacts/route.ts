import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

/** Creates a labeled phone contact under a carrier (e.g. "Customer Service Number"). Appended to the end of the existing order. */
export async function POST(req: NextRequest, { params }: Params) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id: carrierId } = await params;
  const body = (await req.json().catch(() => ({}))) as { label?: string; phone?: string };
  const label = body.label?.trim();
  const phone = body.phone?.trim();

  if (!label) return NextResponse.json({ error: "Label is required" }, { status: 400 });
  if (!phone) return NextResponse.json({ error: "Phone number is required" }, { status: 400 });

  const carrier = await db.carrier.findUnique({ where: { id: carrierId } });
  if (!carrier) return NextResponse.json({ error: "Carrier not found" }, { status: 404 });

  const last = await db.carrierContact.findFirst({ where: { carrierId }, orderBy: { order: "desc" } });
  const contact = await db.carrierContact.create({
    data: { carrierId, label, phone, order: (last?.order ?? -1) + 1 },
  });

  return NextResponse.json({ contact }, { status: 201 });
}
