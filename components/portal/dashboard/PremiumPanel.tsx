import { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** Elevated card shell used throughout the redesigned personal dashboard —
 * subtle gradient sheen + ambient shadow, distinct from the flatter `Card`
 * primitive used across the rest of the app. */
export function PremiumPanel({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-surface",
        "shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_24px_48px_-28px_rgba(0,0,0,0.7)]",
        className,
      )}
      {...props}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.025] via-transparent to-transparent" />
      <div className="relative">{children}</div>
    </div>
  );
}
