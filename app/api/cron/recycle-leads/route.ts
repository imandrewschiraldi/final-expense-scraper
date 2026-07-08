import { NextRequest, NextResponse } from "next/server";
import { recycleStaleAssignedLeads } from "@/lib/assignment";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await recycleStaleAssignedLeads();
  return NextResponse.json(result);
}
