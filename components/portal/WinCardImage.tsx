"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { generateWinCard, type WinCardData } from "@/lib/winCard";

/** Literal "Barlow Condensed" / "IBM Plex Mono" family names, loaded
 *  separately from the app's self-hosted next/font (which renames the
 *  family) — the win card's canvas code sets ctx.font to these exact
 *  strings, so the browser needs them registered under these names. */
function WinCardFonts() {
  return (
    // eslint-disable-next-line @next/next/no-page-custom-font -- only this page's canvas needs these literal font-family names
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=IBM+Plex+Mono:wght@400;500&display=swap"
    />
  );
}

/** Renders a BIG WIN canvas card (lib/winCard.ts's generateWinCard) for any
 *  WinCardData — shared by Submit Policy's post-sale win card (WinCard.tsx)
 *  and the Commission Calculator's Step 4 preview, which feeds it live
 *  calculator state instead of a frozen policy snapshot. Same canvas
 *  drawing code either way. */
export function WinCardImage({ data, downloadName }: { data: WinCardData; downloadName: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    generateWinCard(data, { logoUrl: "/tier1-logo.jpg" })
      .then((dataUrl: string) => {
        if (!cancelled) setUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-render keyed on the data's own fields, not object identity
  }, [data.agentName, data.annualPremium, data.commission, data.product, data.carrier, data.date, data.handle, data.badge]);

  if (error) return null;

  return (
    <div className="space-y-3">
      <WinCardFonts />
      <div className="flex items-center justify-center overflow-hidden rounded-[14px] border border-border bg-black/40">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- generated data URL, not an optimizable asset
          <img src={url} alt="Win card" className="block h-auto w-full max-w-[520px]" />
        ) : (
          <div className="flex h-[198px] w-full max-w-[520px] items-center justify-center text-xs text-muted">
            Generating card…
          </div>
        )}
      </div>
      {url && (
        <a href={url} download={downloadName}>
          <Button variant="secondary" className="w-full">
            <Download className="size-4" />
            Save Win Card
          </Button>
        </a>
      )}
    </div>
  );
}
