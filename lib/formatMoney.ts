export function formatCurrency(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

/** Rounds to the nearest thousand (or million, once it's that big) for a
 *  compact "$20K"/"$10M" style label — used next to a precise dollar
 *  figure, not in place of one. */
export function formatCompact(value: number) {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `$${Number.isInteger(millions) ? millions : millions.toFixed(1)}M`;
  }
  return value >= 1000 ? `$${Math.round(value / 1000)}K` : `$${Math.round(value)}`;
}
