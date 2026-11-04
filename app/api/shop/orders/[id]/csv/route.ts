import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getBuyerId } from "@/lib/shop/session";
import { buildOrderCsv } from "@/lib/shop/delivery";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const buyerId = await getBuyerId();
  if (!buyerId) return NextResponse.json({ error: "Log in to continue." }, { status: 401 });
  const { id } = await params;
  const order = await db.shopOrder.findFirst({ where: { id, buyerId }, select: { status: true } });
  if (!order || (order.status !== "PAID" && order.status !== "FULFILLED")) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
  const csv = await buildOrderCsv(id);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="veteran-leads-${id.slice(-8).toUpperCase()}.csv"`,
    },
  });
}
