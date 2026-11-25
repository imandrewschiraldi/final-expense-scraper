import { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** Elevated card shell used throughout the redesigned personal dashboard —
 * flat matte surface, same flat/no-shadow treatment as the `Card` primitive
 * used across the rest of the app, just with a larger corner radius. */
export function PremiumPanel({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-surface",
        className,
      )}
      {...props}
    >
      <div className="relative">{children}</div>
    </div>
  );
}
