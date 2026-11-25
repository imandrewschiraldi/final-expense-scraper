import { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** Elevated card shell used throughout the redesigned personal dashboard —
 * flat matte surface + ambient shadow, distinct from the flatter `Card`
 * primitive used across the rest of the app. */
export function PremiumPanel({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-surface",
        "shadow-[0_24px_48px_-28px_rgba(0,0,0,0.7)]",
        className,
      )}
      {...props}
    >
      <div className="relative">{children}</div>
    </div>
  );
}
