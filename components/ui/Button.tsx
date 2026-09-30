import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";

const variants: Record<Variant, string> = {
  // Metallic copper — key actions (create, save, submit, assign)
  primary: "btn-metal-copper",
  // Metallic copper — secondary actions, matches the script tool's default button treatment
  secondary: "btn-metal-copper",
  // Subtle outline for low-emphasis actions — stays flat, not a "status" color
  ghost: "bg-transparent text-muted border-[1.5px] border-border hover:border-copper-dim hover:text-foreground",
  // Metallic red — destructive / negative actions
  danger: "btn-metal-red",
  // Metallic solid green — confirmation / positive terminal actions
  success: "btn-metal-green",
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
          "font-condensed inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-[13px] font-bold tracking-[0.08em] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-40",
          variants[variant],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
