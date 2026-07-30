"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PartyPopper } from "lucide-react";

const PARTICLE_ANGLES = Array.from({ length: 10 }, (_, i) => (i / 10) * 360);

export function CelebrationOverlay({ label, onDismiss }: { label: string | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!label) return;
    const t = setTimeout(onDismiss, 3800);
    return () => clearTimeout(t);
  }, [label, onDismiss]);

  return (
    <AnimatePresence>
      {label && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDismiss}
        >
          <motion.div
            className="relative rounded-2xl border border-copper-dim bg-surface px-10 py-8 text-center shadow-[0_24px_64px_-16px_rgba(200,121,65,0.35)]"
            initial={{ scale: 0.85, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            {PARTICLE_ANGLES.map((angle, i) => (
              <motion.span
                key={angle}
                className="absolute top-1/2 left-1/2 h-1.5 w-1.5 rounded-full bg-copper"
                initial={{ x: 0, y: 0, opacity: 1 }}
                animate={{
                  x: Math.cos((angle * Math.PI) / 180) * 90,
                  y: Math.sin((angle * Math.PI) / 180) * 90,
                  opacity: 0,
                }}
                transition={{ duration: 1, delay: 0.1 + i * 0.02, ease: "easeOut" }}
              />
            ))}
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-copper/10">
              <PartyPopper className="h-7 w-7 text-copper" />
            </div>
            <p className="font-condensed text-lg font-extrabold tracking-wide text-white uppercase">Goal Reached</p>
            <p className="mt-1 text-sm text-muted">{label}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
