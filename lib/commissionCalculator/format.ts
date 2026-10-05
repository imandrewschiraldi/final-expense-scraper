// Money/percent formatting ported verbatim from the standalone Commission
// Calculator tool (fmtMoney/fmtMoneyPrecise/fmtPct) — same math, same
// rounding behavior.

export function fmtMoney(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

export function fmtMoneyPrecise(n: number): string {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return (Number.isInteger(n) ? n : n.toFixed(1)) + "%";
}

export const ADVANCE_RATE = 0.75;
