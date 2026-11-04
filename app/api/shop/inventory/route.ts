import { NextResponse } from "next/server";
import { getInventory } from "@/lib/shop/inventory";

export async function GET() {
  const inv = await getInventory();
  // Buyers only see what they can order; hold/reservation totals stay internal.
  return NextResponse.json({ byTier: inv.byTier, tierTotals: inv.tierTotals, available: inv.available });
}
