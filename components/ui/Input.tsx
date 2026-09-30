import { InputHTMLAttributes, SelectHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-copper-dim focus:outline-none",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

// appearance-none + a hand-drawn chevron background, rather than the native
// dropdown chrome (appearance: auto) — left to the browser/OS, a <select>'s
// closed-state background and text can ignore our dark-theme colors
// entirely (most visibly in Safari, and with some "force dark mode"
// browser features), rendering the selected option unreadable.
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "w-full appearance-none rounded-lg border border-border bg-surface bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23a0a0a0%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_0.5rem_center] bg-no-repeat px-3 py-2 pr-8 text-sm text-foreground focus:border-copper-dim focus:outline-none",
        className,
      )}
      {...props}
    />
  ),
);
Select.displayName = "Select";
