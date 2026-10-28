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
        className="flex h-9 w-9 shrink-0 items-center justify-center text-muted transition-colors hover:text-foreground"
      >
        <Grip className="h-5 w-5" />
      </button>

      {open && (
        <div className="absolute top-full right-0 z-20 mt-2 w-64 rounded-[10px] border border-border bg-surface p-3 shadow-lg">
          <div className="grid grid-cols-2 gap-2">
            {QUICK_LINKS.map((link) => {
              const enabled = !!link.url;
              const tile = (
                <div className={`flex flex-col items-center gap-1 ${enabled ? "" : "cursor-not-allowed opacity-50"}`}>
                  {link.logo ? (
                    <Image
                      src={link.logo}
                      alt={link.name}
                      width={200}
                      height={200}
                      className="h-16 w-full rounded-lg object-contain"
                    />
                  ) : (
                    <div className="flex h-16 w-full items-center justify-center rounded-lg bg-surface2 text-xs font-bold text-muted">
                      {link.name}
                    </div>
                  )}
                  <span className="line-clamp-1 text-[11px] font-semibold text-foreground">{link.name}</span>
                </div>
              );
              return enabled ? (
                <a
                  key={link.id}
                  href={link.url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="rounded-lg transition-opacity hover:opacity-80"
                >
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
