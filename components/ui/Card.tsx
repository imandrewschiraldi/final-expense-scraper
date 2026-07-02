import { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[10px] border border-border bg-surface p-5",
        className,
      )}
      {...props}
    />
  );
}

/** Card with a left accent border and copper-dim outline, matching the reference tool's "dial-card". */
export function AccentCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[10px] border border-copper-dim border-l-4 border-l-copper bg-surface p-5",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mb-4 flex items-center justify-between", className)} {...props} />
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "font-condensed text-lg font-extrabold uppercase tracking-wide text-white",
        className,
      )}
      {...props}
    />
  );
}
