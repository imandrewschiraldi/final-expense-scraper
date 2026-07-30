"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DashboardGrid } from "@/components/portal/DashboardGrid";
import { TimeFilterTabs } from "@/components/portal/TimeFilterTabs";
import { Widget } from "@/lib/dashboardLayoutShared";
import { DateRange } from "@/lib/dashboardMetricsShared";

type WidgetData = { value?: number; series?: { label: string; value: number }[] };

export function DashboardClient({
  scope,
  isAdmin,
  heading,
}: {
  scope: "personal" | "team";
  isAdmin: boolean;
  heading?: string;
}) {
  const [range, setRange] = useState<DateRange>("mtd");
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [data, setData] = useState<Record<string, WidgetData>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/portal/dashboard?scope=${scope}&range=${range}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? `Failed to load dashboard (${res.status})`);
        }
        return res.json();
      })
      .then((json) => {
        setWidgets(json.widgets ?? []);
        setData(json.data ?? {});
        setLoading(false);
        setLoadError(null);
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : "Failed to load dashboard.");
        setLoading(false);
      });
  }, [scope, range]);

  async function saveLayout() {
    setSaving(true);
    setSaveMessage(null);
    const res = await fetch("/api/admin/dashboard-layout", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ widgets }),
    });
    setSaving(false);
    if (res.ok) {
      setSaveMessage("Layout saved.");
      setEditing(false);
    } else {
      setSaveMessage("Failed to save layout.");
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {heading && <h2 className="text-lg font-bold text-white">{heading}</h2>}
        <div className="flex items-center gap-3">
          <TimeFilterTabs value={range} onChange={setRange} />
          {isAdmin && scope === "personal" && (
            <Button variant={editing ? "success" : "secondary"} onClick={() => setEditing((e) => !e)}>
              {editing ? "Done" : "Edit Layout"}
            </Button>
          )}
          {isAdmin && editing && (
            <Button onClick={saveLayout} disabled={saving}>
              {saving ? "Saving..." : "Save Layout"}
            </Button>
          )}
        </div>
      </div>

      {saveMessage && <p className="mb-3 text-sm text-teal-light">{saveMessage}</p>}

      {loading ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : loadError ? (
        <p className="text-sm text-red-light">{loadError}</p>
      ) : (
        <DashboardGrid widgets={widgets} data={data} editable={editing} onWidgetsChange={setWidgets} />
      )}
    </div>
  );
}
