"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDob } from "@/lib/formatDob";
import { cn } from "@/lib/cn";

type LeadTaskRow = {
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  completed: boolean;
  lead: { id: string; firstName: string; lastName: string; phone: string };
  assignedTo: { id: string; name: string | null } | null;
};

// The Contacts page's "Tasks" tab — every open task across every lead
// assigned to this agent (callbacks, follow-ups), not scoped to one
// contact. Mirrors the comment on GET /api/agent/lead-tasks.
export function TasksPanel() {
  const [tasks, setTasks] = useState<LeadTaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeCompleted, setIncludeCompleted] = useState(false);
  // Read once, in an effect rather than during render — Date.now() is an
  // impure call, so render must stay deterministic even at the cost of a
  // one-tick delay before "Overdue" badges can show on first paint.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    function readClock() {
      setNow(Date.now());
    }
    readClock();
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/agent/lead-tasks?includeCompleted=${includeCompleted}`);
        const data = await res.json();
        setTasks(data.tasks ?? []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [includeCompleted]);

  async function toggleCompleted(task: LeadTaskRow) {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t)));
    await fetch(`/api/agent/lead-tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !task.completed }),
    });
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-muted">Every open task across your contacts — callbacks, follow-ups, reminders.</p>
        <label className="flex items-center gap-1.5 text-xs text-muted">
          <input type="checkbox" checked={includeCompleted} onChange={(e) => setIncludeCompleted(e.target.checked)} />
          Show completed
        </label>
      </div>

      <div className="overflow-hidden rounded-[10px] border border-border bg-surface">
        {loading && <div className="px-4 py-6 text-center text-sm text-muted">Loading…</div>}
        {!loading && tasks.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-muted">No open tasks.</div>
        )}
        {!loading &&
          tasks.map((task) => {
            const overdue = !task.completed && !!task.dueAt && now !== null && new Date(task.dueAt).getTime() < now;
            return (
              <div
                key={task.id}
                className="flex items-center gap-3 border-b border-border/60 px-4 py-3 last:border-b-0"
              >
                <input type="checkbox" checked={task.completed} onChange={() => toggleCompleted(task)} />
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm text-foreground", task.completed && "text-muted line-through")}>
                    {task.title}
                  </p>
                  <Link
                    href={`/agent/leads/${task.lead.id}`}
                    className="text-xs text-muted hover:text-foreground hover:underline"
                  >
                    {task.lead.firstName} {task.lead.lastName}
                  </Link>
                </div>
                {task.dueAt && (
                  <span
                    className={cn(
                      "font-condensed shrink-0 rounded px-2 py-0.5 text-[10px] font-bold uppercase",
                      overdue ? "bg-red-light/20 text-red-light" : "bg-amber/20 text-amber",
                    )}
                  >
                    {overdue ? "Overdue" : "Due"} {formatDob(task.dueAt)}
                  </span>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
