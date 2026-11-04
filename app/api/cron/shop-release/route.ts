import { NextRequest, NextResponse } from "next/server";
import { releaseExpiredHolds } from "@/lib/shop/inventory";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await releaseExpiredHolds());
}
