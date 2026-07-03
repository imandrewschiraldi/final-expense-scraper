import { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type CalloutVariant = "teal" | "green" | "gold" | "blue" | "red";

const variants: Record<CalloutVariant, string> = {
  teal: "bg-teal/[0.08] border-teal text-teal-light",
  green: "bg-green/[0.06] border-green text-white",
  gold: "bg-copper/[0.07] border-copper text-copper",
  blue: "bg-blue/[0.07] border-blue text-blue-light",
  red: "bg-red/10 border-red text-red-light",
};

export function Callout({
  variant = "teal",
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
