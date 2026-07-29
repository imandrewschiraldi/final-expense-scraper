import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireAnyRole } from "@/lib/apiAuth";
import { db } from "@/lib/db";

export async function GET() {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const vendors = await db.leadVendor.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ vendors });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const body = await req.json().catch(() => ({}));
  const { name, website, contactInfo, notes } = body as {
    name?: string;
    website?: string;
    contactInfo?: string;
    notes?: string;
  };

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Vendor name is required" }, { status: 400 });
  }

  const vendor = await db.leadVendor.create({
    data: {
      name: name.trim(),
      website: website?.trim() || null,
      contactInfo: contactInfo?.trim() || null,
      notes: notes?.trim() || null,
    },
  });

  return NextResponse.json({ vendor }, { status: 201 });
}
