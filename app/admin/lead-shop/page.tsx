import Link from "next/link";
import { db } from "@/lib/db";
import { US_STATES } from "@/lib/usStates";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { getInventory } from "@/lib/shop/inventory";
import { HOLD_DAYS, SHOP_TIERS, formatCents, tierInfo } from "@/lib/shop/config";
import { stripeConfigured } from "@/lib/shop/stripe";
import { LeadShopUpload } from "@/components/admin/LeadShopUpload";

export const dynamic = "force-dynamic";

export default async function AdminLeadShopPage() {
  const [inv, heldByState, orders, buyerCount, revenue] = await Promise.all([
    getInventory(),
    db.shopLead.groupBy({ by: ["state"], where: { status: "HELD" }, _count: { _all: true } }),
    db.shopOrder.findMany({
      where: { status: { in: ["PAID", "FULFILLED"] } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { buyer: { select: { email: true, name: true } } },
    }),
    db.shopBuyer.count(),
    db.shopOrder.aggregate({ where: { status: { in: ["PAID", "FULFILLED"] } }, _sum: { totalCents: true } }),
  ]);
  const held = Object.fromEntries(heldByState.map((h) => [h.state, h._count._all]));
  const states = US_STATES.filter(
    (s) => held[s.code] || SHOP_TIERS.some((t) => inv.byTier[t.id][s.code]),
  );

  const stat = "font-condensed text-3xl font-bold text-white tabular-nums";
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-condensed text-3xl font-extrabold tracking-wide text-white uppercase">Lead Shop</h1>
          <p className="text-sm text-muted">
            Upload veteran leads for outside buyers. Sold leads are held {HOLD_DAYS} days, then go back on sale in a
            random age group.
          </p>
        </div>
        <Link href="/shop" target="_blank" className="text-sm text-copper hover:underline">
          Open the shop ↗
        </Link>
      </div>

      {!stripeConfigured() && (
        <div className="rounded-md border border-amber/50 bg-amber/10 px-4 py-3 text-sm text-amber">
          Checkout is off until STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are set. Buyers can browse and sign up,
          but can&apos;t pay yet.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SHOP_TIERS.map((t) => (
          <Card key={t.id}>
            <div className="text-xs tracking-[0.1em] text-muted uppercase">
              {t.label} · {formatCents(t.priceCents)}
            </div>
            <div className={stat}>{inv.tierTotals[t.id].toLocaleString("en-US")}</div>
            <div className="text-xs text-muted">available</div>
          </Card>
        ))}
        <Card>
          <div className="text-xs tracking-[0.1em] text-muted uppercase">On {HOLD_DAYS}-day hold</div>
          <div className={stat}>{inv.held.toLocaleString("en-US")}</div>
          <div className="text-xs text-muted">
            {inv.reserved.toLocaleString("en-US")} in checkout · {buyerCount} buyers ·{" "}
            {formatCents(revenue._sum.totalCents ?? 0)} sold
          </div>
        </Card>
      </div>

      <LeadShopUpload />

      <Card>
        <CardHeader>
          <CardTitle>Inventory by state</CardTitle>
        </CardHeader>
        {states.length === 0 ? (
          <p className="text-sm text-muted">No shop leads yet. Upload a CSV above.</p>
        ) : (
          <div className="max-h-[480px] overflow-auto">
            <table className="w-full min-w-[560px] text-sm tabular-nums">
              <thead className="sticky top-0 bg-surface">
                <tr className="text-left text-xs tracking-[0.08em] text-muted uppercase">
                  <th className="py-2 pr-4">State</th>
                  {SHOP_TIERS.map((t) => (
                    <th key={t.id} className="py-2 pr-4 text-right">
                      {t.label}
                    </th>
                  ))}
                  <th className="py-2 text-right">On hold</th>
                </tr>
              </thead>
              <tbody>
                {states.map((s) => (
                  <tr key={s.code} className="border-t border-border">
                    <td className="py-1.5 pr-4">{s.name}</td>
                    {SHOP_TIERS.map((t) => (
                      <td key={t.id} className="py-1.5 pr-4 text-right">
                        {(inv.byTier[t.id][s.code] ?? 0).toLocaleString("en-US")}
                      </td>
                    ))}
                    <td className="py-1.5 text-right text-gold">{(held[s.code] ?? 0).toLocaleString("en-US")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent sales</CardTitle>
        </CardHeader>
        {orders.length === 0 ? (
          <p className="text-sm text-muted">No sales yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm tabular-nums">
              <thead>
                <tr className="text-left text-xs tracking-[0.08em] text-muted uppercase">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Buyer</th>
                  <th className="py-2 pr-4">Lead age</th>
                  <th className="py-2 pr-4 text-right">Leads</th>
                  <th className="py-2 pr-4 text-right">Total</th>
                  <th className="py-2">CSV</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-t border-border">
                    <td className="py-1.5 pr-4">{o.createdAt.toLocaleDateString("en-US")}</td>
                    <td className="py-1.5 pr-4">
                      {o.buyer.name} <span className="text-muted">· {o.deliverToEmail}</span>
                    </td>
                    <td className="py-1.5 pr-4">{tierInfo(o.tier).label}</td>
                    <td className="py-1.5 pr-4 text-right">{o.leadCount.toLocaleString("en-US")}</td>
                    <td className="py-1.5 pr-4 text-right">{formatCents(o.totalCents)}</td>
                    <td className="py-1.5">
                      {o.status === "FULFILLED" ? (
                        <span className="text-green-light">Emailed</span>
                      ) : (
                        <span className="text-amber">Not emailed yet</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
