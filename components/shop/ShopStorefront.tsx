"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ShopLeadTier } from "@prisma/client";
import { cn } from "@/lib/cn";
import { US_STATES } from "@/lib/usStates";
import { TILE_GRID } from "@/lib/shop/tileGrid";
import { HOLD_DAYS, MIN_ORDER_CENTS, SHOP_TIERS, formatCents } from "@/lib/shop/config";

type Props = {
  byTier: Record<ShopLeadTier, Record<string, number>>;
  tierTotals: Record<ShopLeadTier, number>;
  available: number;
  buyer: { email: string; name: string } | null;
};

const STATE_NAME: Record<string, string> = Object.fromEntries(US_STATES.map((s) => [s.code, s.name]));
const DRAFT_KEY = "lead-shop-draft";
const DEFAULT_QTY = 100;

export function ShopStorefront({ byTier, tierTotals, available, buyer }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tier, setTier] = useState<ShopLeadTier>("SIX_PLUS");
  const [sel, setSel] = useState<Record<string, number>>({});
  const [email, setEmail] = useState(buyer?.email ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const counts = byTier[tier];
  const price = SHOP_TIERS.find((t) => t.id === tier)!.priceCents;
  const max = Math.max(1, ...Object.values(counts));

  // Restore an order started before signing up, and release leads from a
  // canceled checkout. sessionStorage only exists after hydration, so this
  // has to run in an effect rather than as initial state.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw) as { tier: ShopLeadTier; sel: Record<string, number> };
        if (SHOP_TIERS.some((t) => t.id === d.tier)) setTier(d.tier);
        setSel(d.sel ?? {});
      }
    } catch {}
    const canceled = searchParams.get("canceled");
    if (canceled) {
      fetch(`/api/shop/orders/${encodeURIComponent(canceled)}/cancel`, { method: "POST" }).finally(() => router.refresh());
      setNotice("Checkout canceled. You weren't charged, and your order is still here if you want to try again.");
      router.replace("/shop", { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ tier, sel }));
    } catch {}
  }, [tier, sel]);

  function chooseTier(t: ShopLeadTier) {
    setTier(t);
    setSel((prev) => {
      const next: Record<string, number> = {};
      for (const [s, q] of Object.entries(prev)) {
        const cap = byTier[t][s] ?? 0;
        if (cap > 0) next[s] = Math.min(q, cap);
      }
      return next;
    });
  }

  function toggle(state: string) {
    const cap = counts[state] ?? 0;
    if (cap === 0) return;
    setSel((prev) => {
      const next = { ...prev };
      if (next[state] != null) delete next[state];
      else next[state] = Math.min(DEFAULT_QTY, cap);
      return next;
    });
  }

  function setQty(state: string, raw: string) {
    const cap = counts[state] ?? 0;
    const n = Math.max(0, Math.min(cap, Math.floor(Number(raw) || 0)));
    setSel((prev) => ({ ...prev, [state]: n }));
  }

  const lines = Object.entries(sel).sort(([a], [b]) => a.localeCompare(b));
  const leadCount = lines.reduce((s, [, q]) => s + q, 0);
  const total = leadCount * price;
  const short = Math.max(0, MIN_ORDER_CENTS - total);
  const leadsToMin = Math.ceil(short / price);

  const inStock = useMemo(
    () => US_STATES.filter((s) => (counts[s.code] ?? 0) > 0).map((s) => s.code),
    [counts],
  );

  async function checkout() {
    setError(null);
    if (!buyer) {
      router.push("/shop/signup?next=/shop");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/shop/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, items: Object.fromEntries(lines.filter(([, q]) => q > 0)), email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Checkout didn't start. Please try again.");
        if (res.status === 409) router.refresh();
        return;
      }
      window.location.href = data.url;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-w-0 gap-0 overflow-hidden rounded-[12px] border border-border bg-background lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-6 p-5 sm:p-6">
        {notice && (
          <div className="rounded-md border border-teal/40 bg-teal/10 px-4 py-3 text-sm text-teal-lighter">{notice}</div>
        )}

        <section>
          <SectionLabel>1 · Lead age</SectionLabel>
          <div className="grid gap-2.5 sm:grid-cols-3">
            {SHOP_TIERS.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={tier === t.id}
                onClick={() => chooseTier(t.id)}
                className={cn(
                  "flex flex-col gap-1 rounded-[10px] border p-4 text-left transition-colors",
                  tier === t.id
                    ? "border-copper bg-copper-glow shadow-[inset_0_0_0_1px_var(--copper)]"
                    : "border-border bg-surface hover:border-copper-dim",
                )}
              >
                <span className="font-condensed text-2xl leading-none font-bold text-white">{t.label}</span>
                <span className="font-semibold text-gold">{formatCents(t.priceCents)} / lead</span>
                <span className="text-[13px] text-muted tabular-nums">
                  {tierTotals[t.id].toLocaleString("en-US")} available
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="min-w-0">
          <SectionLabel>2 · Click states to add them</SectionLabel>
          <div className="overflow-x-auto pb-1">
            <div className="grid min-w-[520px] grid-cols-11 gap-1">
              {TILE_GRID.map(([code, col, row]) => {
                const n = counts[code] ?? 0;
                const picked = sel[code] != null;
                const k = Math.sqrt(n / max);
                return (
                  <button
                    key={code}
                    type="button"
                    disabled={n === 0}
                    aria-pressed={picked}
                    aria-label={`${STATE_NAME[code]}, ${n.toLocaleString("en-US")} available`}
                    title={STATE_NAME[code]}
                    onClick={() => toggle(code)}
                    style={{
                      gridColumn: col + 1,
                      gridRow: row + 1,
                      background: picked ? undefined : n ? `rgba(32,178,170,${(0.08 + k * 0.6).toFixed(2)})` : undefined,
                    }}
                    className={cn(
                      "flex aspect-square flex-col items-center justify-center rounded-md border leading-tight transition-colors",
                      picked ? "border-[#f0b07f] bg-copper text-white" : "border-border bg-surface",
                      n === 0 && "cursor-not-allowed opacity-35",
                    )}
                  >
                    <b className="font-condensed text-[15px] text-white">{code}</b>
                    <small className={cn("text-[10px] tabular-nums", picked ? "text-white" : "text-foreground/70")}>
                      {n.toLocaleString("en-US")}
                    </small>
                  </button>
                );
              })}
            </div>
          </div>
          <p className="mt-2 text-xs text-muted">
            The number under each state is how many {SHOP_TIERS.find((t) => t.id === tier)!.label} leads you can buy
            there right now.
          </p>
        </section>

        <section>
          <SectionLabel>States in stock ({inStock.length})</SectionLabel>
          {inStock.length === 0 ? (
            <p className="text-sm text-muted">No leads in this age group right now. Try another age group.</p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-1.5">
              {inStock.map((code) => (
                <button
                  key={code}
                  type="button"
                  aria-pressed={sel[code] != null}
                  onClick={() => toggle(code)}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-left text-sm",
                    sel[code] != null ? "border-copper bg-copper-glow text-white" : "border-border bg-surface hover:border-copper-dim",
                  )}
                >
                  <span className="truncate">{STATE_NAME[code]}</span>
                  <span className="text-xs text-muted tabular-nums">{(counts[code] ?? 0).toLocaleString("en-US")}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <aside className="flex min-w-0 flex-col gap-4 border-t border-border bg-surface p-5 sm:p-6 lg:border-t-0 lg:border-l">
        <h2 className="font-condensed text-[22px] font-bold tracking-[0.06em] text-white uppercase">Your order</h2>
        <div className="flex max-h-[300px] flex-col gap-2 overflow-auto">
          {lines.length === 0 ? (
            <p className="text-sm text-muted">Click a state on the map to add it.</p>
          ) : (
            lines.map(([code, q]) => (
              <div key={code} className="grid grid-cols-[34px_1fr_92px_20px] items-center gap-2 text-[13px]">
                <b className="font-condensed text-base text-white">{code}</b>
                <span className="text-muted">of {(counts[code] ?? 0).toLocaleString("en-US")}</span>
                <input
                  id={`qty-${code}`}
                  type="number"
                  min={0}
                  max={counts[code] ?? 0}
                  value={q}
                  onChange={(e) => setQty(code, e.target.value)}
                  aria-label={`${STATE_NAME[code]} quantity`}
                  className="w-full rounded-md border border-border bg-input-bg px-2 py-1 text-white tabular-nums"
                />
                <button
                  type="button"
                  onClick={() => toggle(code)}
                  aria-label={`Remove ${STATE_NAME[code]}`}
                  className="text-muted hover:text-red-light"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>

        <div>
          <label htmlFor="deliver-email" className="mb-1 block text-xs text-muted">
            Send CSV to
          </label>
          <input
            id="deliver-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={buyer ? buyer.email : "You'll enter this after signing up"}
            disabled={!buyer}
            className="w-full rounded-lg border border-border bg-input-bg px-3 py-2.5 text-white disabled:opacity-50"
          />
        </div>

        <div className="flex items-baseline justify-between border-t border-border pt-3">
          <span className="text-[13px] text-muted tabular-nums">
            {leadCount.toLocaleString("en-US")} leads · {lines.length} states
          </span>
          <b className="font-condensed text-[30px] text-white tabular-nums">{formatCents(total)}</b>
        </div>

        {leadCount > 0 && short > 0 && (
          <p className="text-[13px] text-amber">
            The minimum order is {formatCents(MIN_ORDER_CENTS)}. Add {leadsToMin.toLocaleString("en-US")} more leads (
            {formatCents(short)}) to check out.
          </p>
        )}
        {error && <p className="text-[13px] text-red-light">{error}</p>}

        <button
          type="button"
          onClick={checkout}
          disabled={busy || leadCount === 0 || short > 0}
          className="btn-metal-copper font-condensed rounded-lg py-3 text-[17px] font-bold tracking-[0.08em] uppercase disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Starting checkout…" : buyer ? "Buy & email CSV" : "Create account to buy"}
        </button>

        <div className="rounded-lg border border-dashed border-gold/40 p-3 text-xs text-gold/90">
          After you buy, these leads are held for you for {HOLD_DAYS} days. No other buyer can get them during that
          time.
        </div>
        <p className="text-xs text-muted tabular-nums">{available.toLocaleString("en-US")} leads available right now.</p>
      </aside>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-condensed mb-2 text-[13px] font-semibold tracking-[0.14em] text-muted uppercase">{children}</div>
  );
}
