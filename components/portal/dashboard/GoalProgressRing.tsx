"use client";

import { useId } from "react";
import { motion } from "motion/react";
import { Check } from "lucide-react";

/** Metallic-gradient ring matching the KPI tiles' copper treatment
 *  elsewhere on the dashboard — a flat `var(--color-copper)` stroke read
 *  noticeably flatter than every other accent on the page. Swaps to the
 *  green-metal gradient and a check badge once the goal is hit, same
 *  "done" language HallOfFameCard already uses for its own tracks. */
export function GoalProgressRing({ percent, size = 76, strokeWidth = 7 }: { percent: number; size?: number; strokeWidth?: number }) {
  const gradientId = useId();
  const clamped = Math.min(100, Math.max(0, percent));
  const complete = clamped >= 100;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            {complete ? (
              <>
                <stop offset="0%" stopColor="var(--green-metal-hi)" />
                <stop offset="100%" stopColor="var(--green-metal-dk)" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="var(--copper-metal-hi)" />
                <stop offset="45%" stopColor="var(--copper-metal)" />
                <stop offset="100%" stopColor="var(--copper-metal-dk)" />
              </>
            )}
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="var(--color-border)" strokeWidth={strokeWidth} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {complete ? (
          <Check className="h-6 w-6" style={{ color: "var(--green-light)" }} />
        ) : (
          <span className="text-sm font-bold text-white">{clamped.toFixed(0)}%</span>
        )}
      </div>
    </div>
  );
}
