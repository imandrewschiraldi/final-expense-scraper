"use client";

import { useState } from "react";
import { getCarrierLogoFile } from "@/lib/carrierLogos";

/**
 * Shows a carrier's logo in place of its name, sized via `className` to fit
 * wherever the name would have gone (inline in a sentence, a table cell, a
 * page heading) — falls back to the plain name when there's no matching
 * file, or if the file 404s, so an unmapped/misspelled carrier never shows
 * a broken image.
 */
export function CarrierLogo({
  name,
  className,
  chip = false,
}: {
  name: string;
  className?: string;
  /** Every logo file is white-only artwork, so it disappears when it lands
   * directly on a theme-dependent light background (a table row, a plain
   * sentence). Set this wherever the logo isn't already sitting on a fixed
   * dark/copper surface, to wrap it in one so it stays visible in light
   * mode too. */
  chip?: boolean;
}) {
  const file = getCarrierLogoFile(name);
  const [failed, setFailed] = useState(false);

  if (!file || failed) {
    return <>{name}</>;
  }

  // Unknown/varying aspect ratios per carrier, plus the onError fallback
  // above, don't fit next/image's required-dimensions model.
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/carrier-logos/${file}`}
      alt={name}
      title={name}
      className={className}
      onError={() => setFailed(true)}
    />
  );

  if (!chip) return img;

  return (
    <span className="inline-flex translate-y-[-1px] items-center rounded bg-black/85 px-1.5 py-1 align-middle">
      {img}
    </span>
  );
}
