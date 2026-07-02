import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary:
    "bg-gold text-background hover:bg-gold-dark border border-gold font-semibold",
  secondary:
    "bg-transparent text-copper-light border border-copper hover:bg-copper/10",
  ghost: "bg-transparent text-foreground border border-border hover:bg-surface-raised",
  danger: "bg-transparent text-red-400 border border-red-500/40 hover:bg-red-500/10",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm tracking-wide uppercase transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
          variants[variant],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
