"use client";

import { useEffect, useState } from "react";
import { F90_DAYS, F90_GRADUATION_AP } from "@/lib/f90Content";
import { formatKpiDate } from "@/lib/kpiTracker";

const RING_RADIUS = 42;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function Ring({
  pct,
  color,
  trackColor = "rgba(255,255,255,0.12)",
  children,
}: {
  pct: number;
  color: string;
  trackColor?: string;
  children?: React.ReactNode;
}) {
  const clamped = Math.max(0, Math.min(1, pct));
  const dash = RING_CIRCUMFERENCE * clamped;
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx={50} cy={50} r={RING_RADIUS} fill="none" stroke={trackColor} strokeWidth={9} />
        <circle
          cx={50}
          cy={50}
          r={RING_RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={9}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${RING_CIRCUMFERENCE - dash}`}
          style={{ transition: "stroke-dasharray 0.4s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

const KPI_RING_FIELDS = [
  { key: "dials" as const, label: "Dials", goal: 300 },
  { key: "apptsShown" as const, label: "Appts", goal: 3 },
  { key: "dealsClosed" as const, label: "Closed", goal: 1 },
];

export function F90Hud({
  dayNumber,
  issuedAP,
  salesCount,
  phase5Unlocked,
}: {
  dayNumber: number;
  issuedAP: number;
  salesCount: number;
  phase5Unlocked: boolean;
}) {
  const daysRemaining = Math.max(0, F90_DAYS - dayNumber);
  const dayPct = Math.min(1, dayNumber / F90_DAYS);
  const apPct = Math.min(1, issuedAP / F90_GRADUATION_AP);
  const salesPct = Math.min(1, salesCount / 5);

  const [entry, setEntry] = useState<{
    dials: number;
    apptsShown: number;
    dealsClosed: number;
  } | null>(null);

  useEffect(() => {
    const today = formatKpiDate(new Date());
    fetch(`/api/agent/kpi-tracker/entry?date=${today}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.entry) setEntry(data.entry);
      })
      .catch(() => {});
  }, []);

  const values = {
    dials: entry?.dials ?? 0,
    apptsShown: entry?.apptsShown ?? 0,
    dealsClosed: entry?.dealsClosed ?? 0,
  };
  const anyGoalHit = KPI_RING_FIELDS.some((f) => values[f.key] >= f.goal);

  return (
    <div className="f90-road-bg rounded-2xl border border-white/10 p-5 shadow-[0_0_40px_rgba(0,0,0,0.5)] sm:p-6">
      <div className="mb-5 text-center">
        <p className="font-condensed text-lg font-extrabold tracking-[0.15em] text-white uppercase sm:text-xl">
          Tier 1 Financial <span className="metal-copper-text">F90 University</span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* Countdown ring */}
        <div className="flex flex-col items-center gap-2">
          <div className="h-20 w-20 sm:h-24 sm:w-24">
            <Ring pct={dayPct} color="var(--copper-metal-hi)">
              <div className="text-center">
                <p className="font-condensed text-xl font-extrabold text-white sm:text-2xl">
                  {daysRemaining}
                </p>
                <p className="text-[9px] font-bold tracking-wide text-white/60 uppercase">
                  Days Left
                </p>
              </div>
            </Ring>
          </div>
          <p className="text-[10px] font-bold tracking-widest text-white/50 uppercase">90-Day Clock</p>
        </div>

        {/* 5-sale gauge */}
        <div className="flex flex-col items-center gap-2">
          <div className="h-20 w-20 sm:h-24 sm:w-24">
            <Ring pct={salesPct} color={phase5Unlocked ? "#2fd06b" : "var(--copper-metal-hi)"}>
              <div className="text-center">
                <p className="font-condensed text-xl font-extrabold text-white sm:text-2xl">
                  {Math.min(salesCount, 5)}/5
                </p>
                <p className="text-[9px] font-bold tracking-wide text-white/60 uppercase">Sales</p>
              </div>
            </Ring>
          </div>
          <p className="text-[10px] font-bold tracking-widest text-white/50 uppercase">
            {phase5Unlocked ? "Vault Unlocked" : "Unlocks Vault"}
          </p>
        </div>

        {/* Daily streak rings */}
        <div className="col-span-2 flex flex-col items-center gap-2 sm:col-span-1">
          <div className="flex items-center gap-2">
            {KPI_RING_FIELDS.map((f) => {
              const pct = values[f.key] / f.goal;
              const hit = pct >= 1;
              return (
                <div key={f.key} className="flex flex-col items-center gap-1">
                  <div className="h-12 w-12 sm:h-14 sm:w-14">
                    <Ring pct={pct} color={hit ? "#f5c84b" : "var(--copper-metal-hi)"}>
                      <span className={hit ? "text-[10px] font-extrabold text-[#f5c84b]" : "text-[10px] font-extrabold text-white"}>
                        {values[f.key]}
                      </span>
                    </Ring>
                  </div>
                  <span className="text-[8px] font-bold tracking-wide text-white/50 uppercase">
                    {f.label}
                  </span>
                </div>
              );
            })}
          </div>
          <p
            className={
              anyGoalHit
                ? "text-[10px] font-extrabold tracking-widest text-[#f5c84b] uppercase"
                : "text-[10px] font-bold tracking-widest text-white/50 uppercase"
            }
          >
            {anyGoalHit ? "Goal Hit Today ✓" : "Today's Streak"}
          </p>
        </div>

        {/* XP / production bar */}
        <div className="col-span-2 flex flex-col justify-center gap-2 sm:col-span-1">
          <div className="flex items-baseline justify-between">
            <span className="font-condensed text-lg font-extrabold text-white">
              {`$${Math.round(issuedAP).toLocaleString()}`}
            </span>
            <span className="text-[10px] font-bold text-white/50">
              {`/ $${F90_GRADUATION_AP.toLocaleString()} AP`}
            </span>
          </div>
          <div className="relative h-3 w-full rounded-full bg-black/40">
            <div
              className="h-full rounded-full"
              style={{
                width: `${apPct * 100}%`,
                background: "linear-gradient(90deg, var(--copper-metal-dk), var(--copper-metal-hi))",
                boxShadow: "0 0 10px var(--copper-metal-hi)",
              }}
            />
            {[5000, 10000, 15000, 20000].map((milestone) => (
              <div
                key={milestone}
                className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-black/60"
                style={{
                  left: `${Math.min(100, (milestone / F90_GRADUATION_AP) * 100)}%`,
                  transform: "translate(-50%, -50%)",
                  background: issuedAP >= milestone ? "#f5c84b" : "rgba(255,255,255,0.4)",
                  boxShadow: issuedAP >= milestone ? "0 0 8px #f5c84b" : undefined,
                }}
              />
            ))}
          </div>
          <p className="text-[10px] font-bold tracking-widest text-white/50 uppercase">
            XP to Graduation
          </p>
        </div>
      </div>
    </div>
  );
}
