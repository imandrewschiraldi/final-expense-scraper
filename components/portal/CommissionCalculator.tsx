"use client";

import { useEffect, useMemo, useState } from "react";
import "@/app/portal/commission-calculator/commission-calculator.css";
import { TIER_INFO, TYPE_LABEL, TYPE_BADGE_CLASS, type ProductType, type FflLevel } from "@/lib/commissionCalculator/data";
import { buildCatalog, type PortalCarrier, type RatedPlan } from "@/lib/commissionCalculator/merge";
import { fmtMoney, fmtPct, ADVANCE_RATE } from "@/lib/commissionCalculator/format";
import { WinCardImage } from "@/components/portal/WinCardImage";

const FILTERS: { key: "ALL" | ProductType; label: string }[] = [
  { key: "ALL", label: "All Products" },
  { key: "IUL", label: "IUL Only" },
  { key: "Term", label: "Term Only" },
  { key: "WL", label: "Whole Life Only" },
];

type RatesResponse = { compLevel: number | null; compLevelRaw: string | null; carriers: PortalCarrier[] };

export function CommissionCalculator({ agentName }: { agentName: string | null }) {
  const [rates, setRates] = useState<RatesResponse | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [carrier, setCarrier] = useState("Americo");
  const [product, setProduct] = useState("HMS 125");
  const [premium, setPremium] = useState(25000);
  const [filter, setFilter] = useState<"ALL" | ProductType>("ALL");

  useEffect(() => {
    fetch("/api/portal/carrier-plans/rates")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: RatesResponse) => setRates(data))
      .catch(() => setLoadError(true));
  }, []);

  const catalog = useMemo(() => buildCatalog(rates?.carriers ?? [], rates?.compLevel ?? null), [rates]);

  // The company/product the agent had selected may not exist in the
  // catalog (e.g. before it loads) — fall back to the first real option.
  const currentCompany = catalog.find((c) => c.carrier === carrier) ?? catalog[0];
  const currentProduct: RatedPlan | undefined =
    currentCompany?.products.find((p) => p.product === product) ?? currentCompany?.products[0];

  const rate = currentProduct?.ratePercent ?? null;
  const available = rate !== null;
  const commission = available ? premium * (rate / 100) : 0;
  const advanceNow = commission * ADVANCE_RATE;
  const heldBack = commission - advanceNow;
  const monthlyAmount = commission / 12;

  const compLevel = rates?.compLevel ?? null;
  const tierInfo = compLevel !== null ? TIER_INFO[compLevel as FflLevel] : undefined;

  const compareRows = useMemo(() => {
    const rows = catalog
      .flatMap((c) => c.products.map((p) => ({ ...p })))
      .filter((p) => p.ratePercent !== null)
      .filter((p) => filter === "ALL" || p.type === filter)
      .map((p) => ({ ...p, amount: premium * ((p.ratePercent as number) / 100) }));
    rows.sort((a, b) => b.amount - a.amount);
    return rows;
  }, [catalog, filter, premium]);

  function selectCompany(name: string) {
    setCarrier(name);
    const firstProduct = catalog.find((c) => c.carrier === name)?.products[0];
    if (firstProduct) setProduct(firstProduct.product);
  }

  function selectCompanyProduct(name: string, productName: string) {
    setCarrier(name);
    setProduct(productName);
  }

  return (
    <div className="t1-cc">
      <div className="mb-7">
        <div className="eyebrow">Tier 1 Financial</div>
        <h1>Commission Calculator</h1>
        <p className="sub">
          See exactly what a sale pays at your real contract level — the advance/back-end split, how every carrier
          compares, and a card to share the win.
        </p>
      </div>

      {loadError && <p className="mb-4 text-sm text-red-light">Couldn&apos;t load carrier rates. Try reloading the page.</p>}

      <div className="t1cc-main">
        <section className="panel">
          <div className="panel-head">
            <div className="panel-title">Step 1 — Your Numbers</div>
          </div>
          <div className="panel-body">
            <div className="controls-grid">
              <div className="control">
                <label>Your Contract Level</label>
                {compLevel !== null ? (
                  <>
                    <div className="value-row">
                      <span className="big">{compLevel}%</span>
                      <span className="tag">{tierInfo?.name ?? "On file"}</span>
                    </div>
                    {tierInfo && <div className="tier-note">{tierInfo.note}</div>}
                  </>
                ) : (
                  <div className="tier-note">
                    Your contract level isn&apos;t set on your account yet — ask your manager to add it before this
                    calculator can show real numbers.
                  </div>
                )}
              </div>
              <div className="control">
                <label>Annual Premium</label>
                <div className="value-row">
                  <span className="big">{fmtMoney(premium)}</span>
                  <span className="tag">per policy</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100000}
                  step={100}
                  value={premium}
                  onChange={(e) => setPremium(Number(e.target.value))}
                  style={{ ["--fill" as string]: `${(premium / 100000) * 100}%` }}
                />
                <div className="scale-labels">
                  <span>$0</span>
                  <span>$100,000</span>
                </div>
                <div className="premium-input">
                  <span>Exact:</span>
                  <input
                    type="number"
                    min={0}
                    max={100000}
                    step={1}
                    value={premium}
                    onChange={(e) => setPremium(Math.max(0, Math.min(100000, Number(e.target.value) || 0)))}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div className="panel-title">Step 2 — Carrier &amp; Product</div>
          </div>
          <div className="panel-body">
            <div className="company-tabs">
              {catalog.map((c) => (
                <div
                  key={c.carrier}
                  className={`company-tab${c.carrier === currentCompany?.carrier ? " active" : ""}`}
                  onClick={() => selectCompany(c.carrier)}
                >
                  {c.carrier}
                </div>
              ))}
            </div>
            <div className="product-grid">
              {currentCompany?.products.map((p) => (
                <div
                  key={p.product}
                  className={`product-card${p.product === currentProduct?.product ? " active" : ""}`}
                  onClick={() => setProduct(p.product)}
                >
                  <div className="pname">{p.product}</div>
                  <div className="prate">{fmtPct(p.ratePercent)}</div>
                  <span className={`badge ${TYPE_BADGE_CLASS[p.type]}`}>{TYPE_LABEL[p.type]}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div className="panel-title">Step 3 — Your Payout</div>
          </div>
          <div className="panel-body">
            <div className="ledger">
              <div>
                <div className="ledger-label">
                  {currentCompany && currentProduct ? `${currentCompany.carrier} — ${currentProduct.product}` : "Select a product above"}
                </div>
                <div className="ledger-amount metal-copper-text">{fmtMoney(commission)}</div>
                <div className="ledger-sub">
                  {available ? "Commission you're paid on this policy" : "Not available at your contract level"}
                </div>
              </div>
              <div className="ledger-breakdown">
                <div className="bd-row">
                  <span className="k">Annual Premium</span>
                  <span className="v">{fmtMoney(premium)}</span>
                </div>
                <div className="bd-row">
                  <span className="k">Your Contract Level</span>
                  <span className="v">{compLevel !== null ? `${compLevel}%` : "—"}</span>
                </div>
                <div className="bd-row">
                  <span className="k">Carrier Payout Rate</span>
                  <span className="v">{fmtPct(rate)}</span>
                </div>
                <div className="bd-row">
                  <span className="k">Total First-Year Commission</span>
                  <span className="v">{fmtMoney(commission)}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div className="panel-title">Step 3B — How It&apos;s Actually Paid Out (Advance Schedule)</div>
          </div>
          <div className="panel-body">
            <div className="ledger" style={{ gridTemplateColumns: "1fr", gap: "20px", alignItems: "start" }}>
              <div className="tier-note" style={{ marginTop: 0, borderLeft: "none", paddingLeft: 0 }}>
                The carrier advances <strong>75%</strong> of the first-year commission up front. That&apos;s 9 of the 12
                months, paid to you net as soon as the policy is issued and paid. The remaining <strong>25%</strong> (the
                last 3 months) isn&apos;t advanced. The carrier pays it out as it&apos;s earned, in{" "}
                <strong>months 10, 11, and 12</strong> of the policy.
              </div>
              <div className="controls-grid" style={{ gridTemplateColumns: "1.1fr 1fr", gap: "30px", alignItems: "start" }}>
                <div>
                  <div className="bd-row" style={{ marginTop: 0 }}>
                    <span className="k">Net Advance Paid Now (75%)</span>
                    <span className="v">{fmtMoney(advanceNow)}</span>
                  </div>
                  <div className="bd-row">
                    <span className="k">
                      Back End Balance
                      <br />
                      <span style={{ fontSize: "11px", color: "var(--muted)" }}>(25%, months 10 to 12)</span>
                    </span>
                    <span className="v">{fmtMoney(heldBack)}</span>
                  </div>
                </div>
                <div>
                  <table style={{ marginTop: 0 }}>
                    <thead>
                      <tr>
                        <th>Policy Month</th>
                        <th className="num">Paid To You</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>1 to 9 (advanced now)</td>
                        <td className="num amt">{fmtMoney(advanceNow)}</td>
                      </tr>
                      <tr>
                        <td>Month 10</td>
                        <td className="num amt">{fmtMoney(monthlyAmount)}</td>
                      </tr>
                      <tr>
                        <td>Month 11</td>
                        <td className="num amt">{fmtMoney(monthlyAmount)}</td>
                      </tr>
                      <tr>
                        <td>Month 12</td>
                        <td className="num amt">{fmtMoney(monthlyAmount)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div className="panel-title">Step 4 — Share Your Win</div>
          </div>
          <div className="panel-body">
            <WinCardImage
              data={{
                agentName,
                annualPremium: premium,
                commission: available ? commission : null,
                product: currentProduct?.product ?? null,
                carrier: currentCompany?.carrier ?? null,
                date: new Date(),
              }}
              downloadName="tier1-win-preview.png"
            />
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div className="panel-title">Compare Every Product At Your Level</div>
          </div>
          <div className="panel-body">
            <div className="compare-controls">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  className={`filter-btn${filter === f.key ? " active" : ""}`}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <table>
              <thead>
                <tr>
                  <th className="num rank-col">#</th>
                  <th>Carrier</th>
                  <th>Product</th>
                  <th>Type</th>
                  <th className="num">Payout %</th>
                  <th className="num">You Earn</th>
                </tr>
              </thead>
              <tbody>
                {compareRows.map((row, i) => (
                  <tr
                    key={`${row.carrier}-${row.product}`}
                    className={row.carrier === currentCompany?.carrier && row.product === currentProduct?.product ? "selected" : ""}
                    onClick={() => selectCompanyProduct(row.carrier, row.product)}
                  >
                    <td className="rank">{i + 1}</td>
                    <td className="company">{row.carrier}</td>
                    <td>{row.product}</td>
                    <td>
                      <span className={`badge ${TYPE_BADGE_CLASS[row.type]}`}>{TYPE_LABEL[row.type]}</span>
                    </td>
                    <td className="num rate">{fmtPct(row.ratePercent)}</td>
                    <td className="num amt">{fmtMoney(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <footer className="mt-10 border-t border-border pt-5 text-[11.5px] leading-relaxed text-muted">
        Commission = Annual Premium × Carrier Payout Rate at your contract level. Rates come from your agency&apos;s own
        carrier comp grid where it&apos;s been entered, and from current carrier compensation guides otherwise. A dash
        (—) means the product isn&apos;t available at your contract level. Carrier grids and product availability are
        subject to change — confirm current rates with your upline before quoting compensation to a new agent.
      </footer>
    </div>
  );
}
