"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { format } from "date-fns";
import { CalendarRange, LineChart, Plus, Receipt, Target, Trash2, Trophy, UserPlus, Wallet, X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { PremiumPanel } from "@/components/portal/dashboard/PremiumPanel";
import { GoalProgressRing } from "@/components/portal/dashboard/GoalProgressRing";
import {
  GOAL_CATEGORIES,
  GOAL_CATEGORY_LABELS,
  GOAL_CATEGORY_FORMAT,
  GoalWithProgress,
  GoalCategoryKey,
} from "@/lib/personalDashboardShared";

const GOAL_CATEGORY_ICONS: Record<string, LucideIcon> = {
  MONTHLY_AP: LineChart,
  ANNUAL_AP: CalendarRange,
  ISSUED_PREMIUM: Receipt,
  POLICY_COUNT: Target,
  INCOME: Wallet,
  RECRUITING: UserPlus,
};

function formatGoalValue(category: string, value: number) {
  const fmt = GOAL_CATEGORY_FORMAT[category] ?? "currency";
  if (fmt === "currency") {
    return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  }
  return Math.round(value).toLocaleString("en-US");
}

function periodPreset(preset: "month" | "year"): { start: string; end: string } {
  const now = new Date();
  if (preset === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start: format(start, "yyyy-MM-dd"), end: format(end, "yyyy-MM-dd") };
  }
  const start = new Date(now.getFullYear(), 0, 1);
  const end = new Date(now.getFullYear(), 11, 31);
  return { start: format(start, "yyyy-MM-dd"), end: format(end, "yyyy-MM-dd") };
}

function GoalCreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [category, setCategory] = useState<GoalCategoryKey>("MONTHLY_AP");
  const [targetValue, setTargetValue] = useState("");
  const [preset, setPreset] = useState<"month" | "year" | "custom">("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    const value = Number(targetValue);
    if (!value || value <= 0) {
      setError("Enter a target greater than 0.");
      return;
    }
    const { start, end } = preset === "custom" ? { start: customStart, end: customEnd } : periodPreset(preset);
    if (!start || !end) {
      setError("Pick a start and end date.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/portal/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, targetValue: value, periodStart: start, periodEnd: end }),
    });
    setSaving(false);
    if (res.ok) {
      onCreated();
      onClose();
    } else {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Failed to create goal.");
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-[0_24px_64px_-20px_rgba(0,0,0,0.7)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-condensed text-lg font-extrabold tracking-wide text-white uppercase">New Goal</h3>
          <button onClick={onClose} className="text-muted hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-bold tracking-[0.1em] text-muted uppercase">Category</label>
            <Select value={category} onChange={(e) => setCategory(e.target.value as GoalCategoryKey)}>
              {GOAL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {GOAL_CATEGORY_LABELS[c]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold tracking-[0.1em] text-muted uppercase">Target</label>
            <Input
              type="number"
              min={1}
              placeholder={GOAL_CATEGORY_FORMAT[category] === "count" ? "e.g. 20" : "e.g. 50000"}
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold tracking-[0.1em] text-muted uppercase">Period</label>
            <Select value={preset} onChange={(e) => setPreset(e.target.value as typeof preset)}>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
              <option value="custom">Custom</option>
            </Select>
          </div>
          {preset === "custom" && (
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
              <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
            </div>
          )}
          {error && <p className="text-sm text-red-light">{error}</p>}
          <Button className="w-full" onClick={submit} disabled={saving}>
            {saving ? "Creating..." : "Create Goal"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

function GoalCard({ goal, index, onDeleted }: { goal: GoalWithProgress; index: number; onDeleted: () => void }) {
  const complete = goal.percent >= 100;
  const Icon = GOAL_CATEGORY_ICONS[goal.category] ?? Target;

  async function remove() {
    await fetch(`/api/portal/goals/${goal.id}`, { method: "DELETE" });
    onDeleted();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3) }}
    >
      <PremiumPanel
        className={
          complete
            ? "flex items-center gap-4 border-[rgba(125,255,125,0.3)] p-4 transition-colors duration-200"
            : "flex items-center gap-4 p-4 transition-colors duration-200 hover:border-copper-dim-gradient"
        }
      >
        <GoalProgressRing percent={goal.percent} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={
                  complete
                    ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                    : "metal-copper-surface flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                }
                style={
                  complete
                    ? { background: "linear-gradient(135deg, var(--green-metal-hi) 0%, var(--green-metal-dk) 100%)" }
                    : undefined
                }
              >
                <Icon className="h-3.5 w-3.5 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.55)]" />
              </span>
              <p className="font-condensed truncate text-sm font-bold tracking-wide text-white uppercase">
                {GOAL_CATEGORY_LABELS[goal.category] ?? goal.category}
              </p>
            </div>
            <button onClick={remove} className="shrink-0 text-muted hover:text-red-light" aria-label="Delete goal">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1.5 text-xs text-muted">
            {complete ? (
              <span className="font-semibold" style={{ color: "var(--green-light)" }}>
                Goal hit — {formatGoalValue(goal.category, goal.targetValue)}
              </span>
            ) : (
              <>
                {formatGoalValue(goal.category, goal.remaining)} remaining of {formatGoalValue(goal.category, goal.targetValue)}
              </>
            )}
          </p>
        </div>
      </PremiumPanel>
    </motion.div>
  );
}

export function GoalsSection({
  goals,
  recentWins,
  onChanged,
}: {
  goals: GoalWithProgress[];
  recentWins: { id: string; category: string; achievedAt: string | null }[];
  onChanged: () => void;
}) {
  const [showModal, setShowModal] = useState(false);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Goals</h2>
        <Button variant="secondary" onClick={() => setShowModal(true)}>
          <Plus className="mr-1 h-4 w-4" /> New Goal
        </Button>
      </div>

      {goals.length === 0 ? (
        <PremiumPanel className="flex flex-col items-center gap-3 p-8 text-center">
          <span className="metal-copper-surface flex h-12 w-12 items-center justify-center rounded-full">
            <Target className="h-5 w-5 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.55)]" />
          </span>
          <div>
            <p className="font-condensed text-sm font-bold tracking-wide text-white uppercase">No active goals yet</p>
            <p className="mt-1 text-sm text-muted">Set one to start tracking your pace toward it.</p>
          </div>
          <Button variant="secondary" onClick={() => setShowModal(true)}>
            <Plus className="mr-1 h-4 w-4" /> New Goal
          </Button>
        </PremiumPanel>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {goals.map((goal, i) => (
            <GoalCard key={goal.id} goal={goal} index={i} onDeleted={onChanged} />
          ))}
        </div>
      )}

      {recentWins.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {recentWins.map((win) => (
            <span
              key={win.id}
              className="flex items-center gap-1.5 rounded-full border-copper-dim-gradient bg-copper-gradient-05 px-3 py-1 text-xs text-[var(--copper-metal)]"
            >
              <Trophy className="h-3.5 w-3.5" />
              {GOAL_CATEGORY_LABELS[win.category] ?? win.category}
              {win.achievedAt && <span className="text-muted">· {format(new Date(win.achievedAt), "MMM d")}</span>}
            </span>
          ))}
        </div>
      )}

      {showModal && <GoalCreateModal onClose={() => setShowModal(false)} onCreated={onChanged} />}
    </div>
  );
}
