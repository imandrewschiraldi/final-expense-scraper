"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { getCarrierLogoFile } from "@/lib/carrierLogos";

/**
 * Shows a carrier's logo in place of its name, sized via `className` to fit
 * wherever the name would have gone (inline in a sentence, a table cell, a
 * page heading) — falls back to the plain name when there's no matching
 * file, or if the file 404s, so an unmapped/misspelled carrier never shows
 * a broken image.
 *
 * The files are white-only artwork, which would disappear on light mode's
 * light surfaces — the shared `.carrier-logo-img` class (globals.css) flips
 * it to solid black under `[data-theme="light"]` instead.
 */
export function CarrierLogo({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const file = getCarrierLogoFile(name);
  const [failed, setFailed] = useState(false);

  if (!file || failed) {
    return <>{name}</>;
  }

  // Unknown/varying aspect ratios per carrier, plus the onError fallback
  // above, don't fit next/image's required-dimensions model.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/carrier-logos/${file}`}
      alt={name}
      title={name}
      className={cn("carrier-logo-img", className)}
      onError={() => setFailed(true)}
    />
  );
}
