"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Grip } from "lucide-react";
import { QUICK_LINKS } from "@/lib/quickLinks";

/**
 * A 3x3-grid "apps" trigger next to the theme toggle — opens a small panel
 * of outside-platform shortcuts (training camp, FFL's own portal, licensing
 * tools) that open in a new tab instead of leaving this one. Tiles whose
 * `url` hasn't been set yet (see lib/quickLinks.ts) render disabled rather
 * than linking nowhere.
 */
export function QuickLinksMenu() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Quick links"
        title="Quick links"
        className="text-muted transition-colors hover:text-foreground"
      >
        <Grip className="h-5 w-5" />
      </button>

      {open && (
        <div className="absolute top-full right-0 z-20 mt-2 w-60 rounded-[10px] border border-border bg-surface p-3 shadow-lg">
          <p className="font-condensed mb-2 text-[10px] font-bold tracking-[0.12em] text-muted uppercase">Quick Links</p>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_LINKS.map((link) => {
              const enabled = !!link.url;
              const tile = (
                <div
                  className={`flex flex-col items-center gap-1.5 rounded-lg border border-border bg-surface2 p-3 text-center transition-colors ${
                    enabled ? "hover:border-copper-dim-gradient" : "cursor-not-allowed opacity-50"
                  }`}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-bold text-muted">
                    {link.logo ? (
                      <Image src={link.logo} alt="" width={36} height={36} className="rounded-full object-contain" />
                    ) : (
                      link.name.charAt(0)
                    )}
                  </div>
                  <span className="line-clamp-2 text-[11px] font-semibold text-foreground">{link.name}</span>
                </div>
              );
              return enabled ? (
                <a key={link.id} href={link.url!} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
                  {tile}
                </a>
              ) : (
                <div key={link.id} title="Link coming soon">
                  {tile}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
