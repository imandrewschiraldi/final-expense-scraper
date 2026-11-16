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
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
