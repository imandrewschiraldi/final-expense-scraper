"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Leaf, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";
import { Theme, useTheme } from "@/lib/useTheme";

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "dark", label: "Dark", icon: Moon },
  { value: "light", label: "Light", icon: Sun },
  { value: "green", label: "Green", icon: Leaf },
];

const ITEM_CLASS =
  "font-condensed flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-bold tracking-[0.03em] text-muted uppercase transition-colors hover:bg-copper-gradient-08 hover:metal-copper-text";

/** Replaces the old single-button dark/light cycle now that there are
 *  three themes — a dropdown lets anyone jump straight to the one they
 *  want instead of clicking through the others to get there. Trigger
 *  icon always shows the CURRENT theme (unlike the old cycle button,
 *  which showed the one a click would switch TO), since there's no
 *  longer a single "next" state to hint at. */
export function ThemeMenu() {
  const [theme, setTheme] = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const CurrentIcon =
    THEME_OPTIONS.find((t) => t.value === theme)?.icon ?? Moon;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Change theme"
        title="Change theme"
        className="flex h-9 w-9 shrink-0 items-center justify-center text-muted transition-colors hover:text-foreground"
      >
        <CurrentIcon className="h-5 w-5" />
      </button>

      {open && (
        <div className="absolute top-full right-0 z-20 mt-2 w-40 rounded-[10px] border border-border bg-surface p-2 shadow-lg">
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setTheme(value);
                setOpen(false);
              }}
              className={ITEM_CLASS}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  value === theme && "text-[var(--copper-metal)]",
                )}
              />
              <span
                className={cn("flex-1", value === theme && "metal-copper-text")}
              >
                {label}
              </span>
              {value === theme && (
                <Check className="h-4 w-4 shrink-0 text-[var(--copper-metal)]" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
