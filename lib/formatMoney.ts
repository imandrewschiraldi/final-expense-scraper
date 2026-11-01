export function formatCurrency(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

/** Rounds to the nearest thousand for a compact "$20K" style label — used
 *  next to a precise dollar figure, not in place of one. */
export function formatCompact(value: number) {
  return value >= 1000 ? `$${Math.round(value / 1000)}K` : `$${Math.round(value)}`;
}
