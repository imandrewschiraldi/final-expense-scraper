import { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type CalloutVariant = "orange" | "green" | "gold" | "blue" | "red";

const variants: Record<CalloutVariant, string> = {
  orange: "bg-orange/[0.08] border-orange text-orange-light",
  green: "bg-green/[0.06] border-green text-white",
  gold: "bg-copper/[0.07] border-copper text-copper",
  blue: "bg-blue/[0.07] border-blue text-blue-light",
  red: "bg-red/10 border-red text-red-light",
};

export function Callout({
  variant = "orange",
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: CalloutVariant }) {
  return (
    <div
      className={cn(
        "rounded-r-lg border-l-4 px-5 py-4 text-sm leading-relaxed",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
