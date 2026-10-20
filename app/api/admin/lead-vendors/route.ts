import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { db } from "@/lib/db";

export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const vendors = await db.leadVendor.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }] });
  return NextResponse.json({ vendors });
}

/** Creates a lead vendor, appended to the end of the existing Buy Leads display order. */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const body = (await req.json().catch(() => ({}))) as { name?: string; url?: string; description?: string };
  const name = body.name?.trim();
  const url = body.url?.trim();
  const description = body.description?.trim() || null;

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });

  const last = await db.leadVendor.findFirst({ orderBy: { order: "desc" } });
  const vendor = await db.leadVendor.create({ data: { name, url, description, order: (last?.order ?? -1) + 1 } });
  return NextResponse.json({ vendor }, { status: 201 });
}
