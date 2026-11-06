"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

/** Admin-only master switch for the whole Leaderboard feature (this page,
 *  its sidebar link, and the Overview mini-widget) — off hides it from
 *  every non-admin, while an admin keeps the sidebar link and this
 *  control so it can always be turned back on. */
export function LeaderboardVisibilityToggle({
  initialEnabled,
}: {
  initialEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);

  async function toggle() {
    const next = !enabled;
    setSaving(true);
    setEnabled(next);
    await fetch("/api/admin/leaderboard-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leaderboardEnabled: next }),
    });
    setSaving(false);
  }

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-border bg-surface2 px-4 py-3">
      <p className="text-sm text-foreground">
        {enabled
          ? "The leaderboard is visible to every agent."
          : "The leaderboard is hidden from agents — only admins can see it."}
      </p>
      <Button
        variant={enabled ? "danger" : "secondary"}
        disabled={saving}
        onClick={toggle}
      >
        {enabled ? "Hide Leaderboard" : "Show Leaderboard"}
      </Button>
    </div>
  );
}
