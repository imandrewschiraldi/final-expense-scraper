"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, Store } from "lucide-react";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";
import { VENDORS, vendorSlug } from "@/lib/vendors";

function StatusPill({ live }: { live: boolean }) {
  return (
    <span className="font-condensed flex items-center gap-1.5 text-[11px] font-bold tracking-[0.08em] text-muted uppercase">
      <span className={cn("h-1.5 w-1.5 rounded-full", live ? "metal-green-surface animate-pulse" : "bg-muted")} />
      {live ? "Live Now" : "Coming Soon"}
    </span>
  );
}

function VisitSiteButton({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="font-condensed inline-flex w-fit items-center gap-2 rounded-full bg-[#ffffff] py-2 pr-2 pl-4 text-sm font-bold text-black transition-opacity hover:opacity-90"
    >
      Visit Site
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-background text-white">
        <ArrowUpRight className="h-3 w-3" />
      </span>
    </a>
  );
}

export function BuyLeadsGrid() {
  // Deep link from the sidebar's global search ("type a vendor name, land
  // on it") — ?vendor=<slug> scrolls that card into view and briefly rings
  // it so it's obvious which one matched, instead of just loading the page.
  const searchParams = useSearchParams();
  const targetSlug = searchParams.get("vendor");
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const refs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!targetSlug) return;
    const el = refs.current[targetSlug];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlighted(targetSlug);
    const t = setTimeout(() => setHighlighted(null), 2000);
    return () => clearTimeout(t);
  }, [targetSlug]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {VENDORS.map((vendor) => {
        const slug = vendorSlug(vendor.name);
        return (
          <div
            key={vendor.name}
            id={`vendor-${slug}`}
            ref={(el) => {
              refs.current[slug] = el;
            }}
            // Vendor logos are designed to sit on a dark card — pin this
            // subtree to the dark-theme palette regardless of the page's
            // actual theme, by overriding the same CSS vars globals.css
            // flips for light mode (see the `[data-theme="light"]` block).
            // `cn()` is a bare clsx with no tailwind-merge, so overriding
            // Card's own bg-surface/border-border via a conflicting
            // className wouldn't reliably win the cascade — scoping the
            // variables themselves sidesteps that and fixes the inner
            // text-white/text-muted usages too, with no changes to Card or
            // StatusPill needed.
            style={
              {
                "--background": "#000000",
                "--surface": "#0d0d0d",
                "--surface2": "#141414",
                "--border": "rgba(255, 255, 255, 0.08)",
                "--foreground": "#d0d0d0",
                "--white": "#ffffff",
                "--muted": "#606060",
              } as React.CSSProperties
            }
            className={cn("rounded-[10px] transition-shadow", highlighted === slug && "ring-2 ring-[var(--copper-metal)]")}
          >
            <Card className="flex h-full flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className={cn("inline-flex items-center", vendor.logoOnLight && "rounded-full bg-[#ffffff] px-3 py-1.5")}>
                  <Image
                    src={vendor.logo.src}
                    alt={vendor.name}
                    width={vendor.logo.width}
                    height={vendor.logo.height}
                    className={cn("w-auto", vendor.logoHeightClass ?? "h-8")}
                  />
                </span>
                <StatusPill live />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{vendor.name}</h2>
                {vendor.description && <p className="mt-1 text-sm text-muted">{vendor.description}</p>}
              </div>
              {vendor.bullets && (
                <ul className="space-y-1.5">
                  {vendor.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2 text-sm text-muted">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-copper-dim" />
                      {bullet}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-auto pt-1">
                <VisitSiteButton url={vendor.url} />
              </div>
            </Card>
          </div>
        );
      })}

      <Card className="flex h-full flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-surface2 text-muted">
            <Store className="h-5 w-5" />
          </span>
          <StatusPill live={false} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">More Vendors</h2>
          <p className="mt-1 text-sm text-muted">Additional lead sources are being vetted and will appear here.</p>
        </div>
        <div className="mt-auto pt-1">
          <span className="font-condensed inline-flex w-fit items-center rounded-full border border-border px-4 py-2 text-[13px] font-bold text-muted">
            Check Back Soon
          </span>
        </div>
      </Card>
    </div>
  );
}
