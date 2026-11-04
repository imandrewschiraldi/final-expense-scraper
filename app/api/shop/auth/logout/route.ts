import { NextResponse } from "next/server";
import { clearBuyerSession } from "@/lib/shop/session";

export async function POST() {
  await clearBuyerSession();
  return NextResponse.json({ ok: true });
}
