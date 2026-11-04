"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

/** Generic overlay dialog — backdrop blur + spring-in panel, matching the
 *  weight of CelebrationOverlay. Closes on Escape or a backdrop click.
 *
 *  Portals to document.body rather than rendering in place: a trigger
 *  button nested inside a hover-only wrapper (e.g. a row of icons shown
 *  via `hidden group-hover:flex`, as in a channel list's row actions)
 *  would otherwise collapse the whole modal to nothing the instant the
 *  pointer leaves that row — `display: none` on any ancestor hides a
 *  `position: fixed` descendant too, since it never escapes the render
 *  tree in the first place. Portaling escapes that (and any other
 *  ancestor overflow/stacking quirk) once, for every caller, instead of
 *  each one needing to route around it. */
export function Modal({
  open,
  onClose,
  title,
  titleContent,
  children,
  maxWidthClassName = "max-w-2xl",
  panelBorderClassName = "border-copper-dim-gradient",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  // Replaces the plain text <h2> with custom markup (e.g. a wordmark image)
  // while `title` still provides the modal's accessible name.
  titleContent?: React.ReactNode;
  children: React.ReactNode;
  maxWidthClassName?: string;
  // One of the border-copper-*-gradient utilities. Dim by default; pass
  // "border-copper-gradient" for the brighter variant where the content
  // itself is bold enough (a branded graphic, say) that a dim ring would
  // visually disconnect from it.
  panelBorderClassName?: string;
}) {
  // document.body isn't available during SSR/the first client render —
  // the portal target only exists once mounted.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className={`relative max-h-[85vh] w-full ${maxWidthClassName} overflow-y-auto rounded-2xl bg-surface shadow-[0_32px_80px_-24px_rgba(0,0,0,0.85)]`}
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.97, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label={title}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-6 py-4">
              {titleContent ?? (
                <h2 className="font-condensed text-lg font-extrabold tracking-wide text-white uppercase">{title}</h2>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface2 hover:text-white"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            <div className="p-6">{children}</div>
            {/* The border ring as its own top layer, not applied straight to
                the panel — that pseudo-element sits below the header's own
                `z-10` (needed to stay above scrolled content), which hid the
                ring behind the header's opaque background along the top
                edge instead of wrapping the whole card, title and close
                button included. */}
            <div className={`pointer-events-none absolute inset-0 z-20 rounded-2xl ${panelBorderClassName}`} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
