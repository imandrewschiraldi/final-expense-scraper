"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { DashboardRangeSelect } from "@/components/portal/dashboard/DashboardRangeSelect";
import { DashboardRange } from "@/lib/dashboardRange";
import { cn } from "@/lib/cn";

type CarrierRow = { carrier: string; ap: number; count: number; avgPremium: number };
type ProductRow = { product: string; ap: number; count: number; avgCaseSize: number };

type Scope = "personal" | "org";

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function ReportsPanel() {
  const [scope, setScope] = useState<Scope>("personal");
  const [range, setRange] = useState<DashboardRange>("monthly");
  const [carriers, setCarriers] = useState<CarrierRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/portal/reports?scope=${scope}&range=${range}`)
      .then((res) => res.json())
      .then((data) => {
        setCarriers(data.carriers ?? []);
        setProducts(data.products ?? []);
        setLoading(false);
      });
  }, [scope, range]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setScope("personal")}
            className={cn(
              "font-condensed rounded-lg border-[1.5px] px-4 py-2 text-[13px] font-bold tracking-[0.05em] uppercase transition-colors",
              scope === "personal"
                ? "border-copper bg-copper text-black"
                : "border-border text-muted hover:border-copper hover:text-foreground",
            )}
          >
            My Production
          </button>
          <button
            onClick={() => setScope("org")}
            className={cn(
              "font-condensed rounded-lg border-[1.5px] px-4 py-2 text-[13px] font-bold tracking-[0.05em] uppercase transition-colors",
              scope === "org"
                ? "border-copper bg-copper text-black"
                : "border-border text-muted hover:border-copper hover:text-foreground",
            )}
          >
            Organization
          </button>
        </div>
        <div className="flex items-center gap-2">
          <DashboardRangeSelect value={range} onChange={setRange} />
          <a href={`/api/portal/reports/export?scope=${scope}&range=${range}`}>
            <Button variant="secondary">Export CSV</Button>
          </a>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Carrier Performance</CardTitle>
        </CardHeader>
        {!loading && carriers.length === 0 ? (
          <p className="text-sm text-muted">No policies in this range.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="font-condensed border-b border-border text-[11px] font-bold tracking-[0.1em] text-muted uppercase">
                  <th className="py-2 pr-4">Carrier</th>
                  <th className="py-2 pr-4">Policies</th>
                  <th className="py-2 pr-4">Annual Premium</th>
                  <th className="py-2 pr-4">Avg Premium</th>
                </tr>
              </thead>
              <tbody>
                {carriers.map((c) => (
                  <tr key={c.carrier} className="border-b border-border/60">
                    <td className="py-2 pr-4 text-white">{c.carrier}</td>
                    <td className="py-2 pr-4 text-muted">{c.count}</td>
                    <td className="py-2 pr-4 text-white">{formatCurrency(c.ap)}</td>
                    <td className="py-2 pr-4 text-muted">{formatCurrency(c.avgPremium)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Product Performance</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="font-condensed border-b border-border text-[11px] font-bold tracking-[0.1em] text-muted uppercase">
                <th className="py-2 pr-4">Product</th>
                <th className="py-2 pr-4">Policies</th>
                <th className="py-2 pr-4">Annual Premium</th>
                <th className="py-2 pr-4">Avg Case Size</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.product} className="border-b border-border/60">
                  <td className="py-2 pr-4 text-white">{p.product}</td>
                  <td className="py-2 pr-4 text-muted">{p.count}</td>
                  <td className="py-2 pr-4 text-white">{formatCurrency(p.ap)}</td>
                  <td className="py-2 pr-4 text-muted">{formatCurrency(p.avgCaseSize)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
