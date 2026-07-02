import { InputHTMLAttributes, SelectHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-copper focus:outline-none",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-foreground focus:border-copper focus:outline-none",
        className,
      )}
      {...props}
    />
  ),
);
Select.displayName = "Select";
