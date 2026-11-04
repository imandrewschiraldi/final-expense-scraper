import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getBuyer } from "@/lib/shop/session";
import { HOLD_DAYS, formatCents, tierInfo } from "@/lib/shop/config";
import { OrderActions } from "@/components/shop/OrderActions";

export const dynamic = "force-dynamic";

const STATUS_LABEL = {
  PENDING_PAYMENT: { text: "Waiting for payment", cls: "text-amber border-amber/40" },
  PAID: { text: "Paid · email pending", cls: "text-gold border-gold/40" },
  FULFILLED: { text: "Delivered", cls: "text-green-light border-green/40" },
  EXPIRED: { text: "Canceled", cls: "text-muted border-border" },
} as const;

export default async function ShopOrdersPage({ searchParams }: { searchParams: Promise<{ paid?: string }> }) {
  const buyer = await getBuyer();
  if (!buyer) redirect("/shop/login?next=/shop/orders");
  const { paid } = await searchParams;

  const orders = await db.shopOrder.findMany({
    where: { buyerId: buyer.id, NOT: { status: "EXPIRED", paidAt: null } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-condensed text-3xl font-bold text-white">My orders</h1>
      {paid && (
        <div className="rounded-md border border-green/40 bg-green/10 px-4 py-3 text-sm text-green-light">
          Payment received. Your CSV is being emailed now and usually arrives within a few minutes. You can also
          download it below once the order shows as paid.
        </div>
      )}
      {orders.length === 0 ? (
        <div className="rounded-[12px] border border-border bg-surface p-6 text-muted">
          You haven&apos;t bought any leads yet. Your orders and CSV downloads will show up here.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[12px] border border-border bg-surface">
          <table className="w-full min-w-[720px] text-sm tabular-nums">
            <thead>
              <tr className="font-condensed border-b border-border text-left text-xs tracking-[0.1em] text-muted uppercase">
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Lead age</th>
                <th className="px-4 py-3">States</th>
                <th className="px-4 py-3 text-right">Leads</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const states = Object.keys(o.items as Record<string, number>).sort();
                const s = STATUS_LABEL[o.status];
                return (
                  <tr key={o.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-semibold text-white">{o.id.slice(-8).toUpperCase()}</td>
                    <td className="px-4 py-3">{o.createdAt.toLocaleDateString("en-US")}</td>
                    <td className="px-4 py-3">{tierInfo(o.tier).label}</td>
                    <td className="max-w-[220px] truncate px-4 py-3" title={states.join(", ")}>
                      {states.join(", ")}
                    </td>
                    <td className="px-4 py-3 text-right">{o.leadCount.toLocaleString("en-US")}</td>
                    <td className="px-4 py-3 text-right">{formatCents(o.totalCents)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full border px-2 py-0.5 text-xs ${s.cls}`}>{s.text}</span>
                    </td>
                    <td className="px-4 py-3">
                      {(o.status === "PAID" || o.status === "FULFILLED") && <OrderActions orderId={o.id} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted">Leads you buy are held for you for {HOLD_DAYS} days from the date you pay.</p>
    </div>
  );
}
