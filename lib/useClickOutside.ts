import { useEffect } from "react";
import type { RefObject } from "react";

// Closes a popover/dropdown on an outside click, so the user never has to
// re-hit the same toggle button to dismiss it — just click away.
export function useClickOutside(ref: RefObject<HTMLElement | null>, open: boolean, onOutside: () => void) {
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}
