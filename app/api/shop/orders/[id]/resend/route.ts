import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getBuyerId } from "@/lib/shop/session";
import { deliverOrder } from "@/lib/shop/delivery";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const buyerId = await getBuyerId();
  if (!buyerId) return NextResponse.json({ error: "Log in to continue." }, { status: 401 });
  const { id } = await params;
  const order = await db.shopOrder.findFirst({ where: { id, buyerId }, select: { status: true } });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.status !== "PAID" && order.status !== "FULFILLED") {
    return NextResponse.json({ error: "This order hasn't been paid." }, { status: 400 });
  }
  try {
    await deliverOrder(id);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "The email didn't send. Download the CSV instead, or try again in a minute." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
