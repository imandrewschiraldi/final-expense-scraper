import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";

const variants: Record<Variant, string> = {
  // Gold — key actions (create, save, submit, assign)
  primary: "bg-transparent text-gold border-[1.5px] border-gold hover:bg-gold hover:text-black",
  // Copper — secondary actions, matches the script tool's default button treatment
  secondary: "bg-transparent text-copper border-[1.5px] border-copper hover:bg-copper hover:text-black",
  // Subtle outline for low-emphasis actions
  ghost: "bg-transparent text-muted border-[1.5px] border-border hover:border-copper-dim hover:text-foreground",
  // Red — destructive / negative actions
  danger: "bg-transparent text-red border-[1.5px] border-red hover:bg-red hover:text-white",
  // Solid green — confirmation / positive terminal actions
  success: "bg-green text-white border-[1.5px] border-green hover:opacity-85",
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
