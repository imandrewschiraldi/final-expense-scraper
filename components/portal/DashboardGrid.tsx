"use client";

import { useRef, useState } from "react";
import { motion } from "motion/react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  FileText,
  Wallet,
  FileCheck2,
  DollarSign,
  Target,
  TrendingUp,
  LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { GRID_COLUMNS, Widget, WidgetType } from "@/lib/dashboardLayoutShared";
import { METRIC_LABELS, METRIC_FORMATS, MetricKey } from "@/lib/dashboardMetricsShared";
import { useCountUp } from "@/lib/useCountUp";

const ROW_HEIGHT = 72;
const GAP = 12;

type WidgetData = { value?: number; series?: { label: string; value: number }[] };

const METRIC_ICONS: Record<MetricKey, LucideIcon> = {
  submittedCount: FileText,
  submittedAP: Wallet,
  issuedCount: FileCheck2,
  issuedAP: DollarSign,
  conversionRate: Target,
  avgIssuedPremium: TrendingUp,
};

function formatValue(metric: MetricKey, value: number | undefined) {
  if (value === undefined) return "—";
  const format = METRIC_FORMATS[metric];
  if (format === "currency") {
    return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  }
  if (format === "percent") {
    return `${(value * 100).toFixed(0)}%`;
  }
  return Math.round(value).toLocaleString("en-US");
}

function MetricValue({ metric, value }: { metric: MetricKey; value: number | undefined }) {
  const animated = useCountUp(value);
  return (
    <span className="font-scoreboard text-4xl font-bold text-copper drop-shadow-[0_0_18px_rgba(200,121,65,0.25)]">
      {formatValue(metric, animated)}
    </span>
  );
}

const CHART_METRICS: MetricKey[] = ["submittedCount", "submittedAP", "issuedCount", "issuedAP"];
const ALL_METRICS: MetricKey[] = Object.keys(METRIC_LABELS) as MetricKey[];

export function DashboardGrid({
  widgets,
  data,
  editable = false,
  onWidgetsChange,
}: {
  widgets: Widget[];
  data: Record<string, WidgetData>;
  editable?: boolean;
  onWidgetsChange?: (widgets: Widget[]) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newWidget, setNewWidget] = useState<{ type: WidgetType; metric: MetricKey; label: string }>({
    type: "METRIC",
    metric: "issuedAP",
    label: "Issued AP",
  });

  const maxY = widgets.reduce((max, w) => Math.max(max, w.y + w.h), 0);

  function colWidth() {
    const rect = containerRef.current?.getBoundingClientRect();
    return rect ? (rect.width - GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS + GAP : 60;
  }

  function updateWidget(id: string, patch: Partial<Widget>) {
    if (!onWidgetsChange) return;
    onWidgetsChange(widgets.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  }

  function rectsOverlap(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function wouldCollide(candidate: { x: number; y: number; w: number; h: number }, excludeId: string) {
    return widgets.some((w) => w.id !== excludeId && rectsOverlap(candidate, w));
  }

  function removeWidget(id: string) {
    if (!onWidgetsChange) return;
    onWidgetsChange(widgets.filter((w) => w.id !== id));
  }

  function addWidget() {
    if (!onWidgetsChange) return;
    const id = `w${Date.now()}`;
    const defaultSize = newWidget.type === "METRIC" ? { w: 4, h: 2 } : { w: 12, h: 4 };
    onWidgetsChange([
      ...widgets,
      { id, type: newWidget.type, metric: newWidget.metric, label: newWidget.label || METRIC_LABELS[newWidget.metric], x: 0, y: maxY, ...defaultSize },
    ]);
    setShowAddForm(false);
  }

  function startDrag(e: React.PointerEvent, widget: Widget) {
    if (!editable) return;
    e.preventDefault();
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startX = widget.x;
    const startY = widget.y;
    const cw = colWidth();

    function onMove(ev: PointerEvent) {
      const deltaCols = Math.round((ev.clientX - startClientX) / cw);
      const deltaRows = Math.round((ev.clientY - startClientY) / (ROW_HEIGHT + GAP));
      const newX = Math.min(Math.max(0, startX + deltaCols), GRID_COLUMNS - widget.w);
      const newY = Math.max(0, startY + deltaRows);
      const candidate = { x: newX, y: newY, w: widget.w, h: widget.h };
      if (wouldCollide(candidate, widget.id)) return;
      updateWidget(widget.id, { x: newX, y: newY });
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function startResize(e: React.PointerEvent, widget: Widget) {
    if (!editable) return;
    e.preventDefault();
    e.stopPropagation();
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startW = widget.w;
    const startH = widget.h;
    const cw = colWidth();

    function onMove(ev: PointerEvent) {
      const deltaCols = Math.round((ev.clientX - startClientX) / cw);
      const deltaRows = Math.round((ev.clientY - startClientY) / (ROW_HEIGHT + GAP));
      const newW = Math.min(Math.max(2, startW + deltaCols), GRID_COLUMNS - widget.x);
      const newH = Math.max(2, startH + deltaRows);
      const candidate = { x: widget.x, y: widget.y, w: newW, h: newH };
      if (wouldCollide(candidate, widget.id)) return;
      updateWidget(widget.id, { w: newW, h: newH });
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <div>
      {editable && (
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs text-muted">Drag tiles by their header, resize from the bottom-right corner.</p>
          <Button variant="secondary" onClick={() => setShowAddForm((s) => !s)}>
            {showAddForm ? "Cancel" : "Add Widget"}
          </Button>
        </div>
      )}

      {editable && showAddForm && (
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-[10px] border border-copper-dim bg-surface2 p-4">
          <div>
            <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
              Type
            </label>
            <Select
              value={newWidget.type}
              onChange={(e) => setNewWidget((w) => ({ ...w, type: e.target.value as WidgetType }))}
            >
              <option value="METRIC">Metric Tile</option>
              <option value="BAR_CHART">Bar Chart</option>
              <option value="LINE_CHART">Line Chart</option>
            </Select>
          </div>
          <div>
            <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
              Metric
            </label>
            <Select
              value={newWidget.metric}
              onChange={(e) => setNewWidget((w) => ({ ...w, metric: e.target.value as MetricKey }))}
            >
              {(newWidget.type === "METRIC" ? ALL_METRICS : CHART_METRICS).map((m) => (
                <option key={m} value={m}>
                  {METRIC_LABELS[m]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="font-condensed mb-1 block text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
              Label
            </label>
            <Input
              placeholder={METRIC_LABELS[newWidget.metric]}
              value={newWidget.label}
              onChange={(e) => setNewWidget((w) => ({ ...w, label: e.target.value }))}
            />
          </div>
          <Button onClick={addWidget}>Add</Button>
        </div>
      )}

      <div
        ref={containerRef}
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${GRID_COLUMNS}, minmax(0, 1fr))`,
          gridAutoRows: `${ROW_HEIGHT}px`,
          gap: `${GAP}px`,
        }}
      >
        {widgets.map((widget, index) => {
          const widgetData = data[widget.id];
          const Icon = METRIC_ICONS[widget.metric];
          return (
            <motion.div
              key={widget.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.4), ease: "easeOut" }}
              whileHover={{ y: -2 }}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-surface to-black shadow-[0_1px_0_rgba(255,255,255,0.03)_inset] transition-shadow duration-200 hover:border-copper-dim hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
              style={{
                gridColumn: `${widget.x + 1} / span ${widget.w}`,
                gridRow: `${widget.y + 1} / span ${widget.h}`,
              }}
            >
              <div
                className={
                  "font-condensed flex shrink-0 items-center justify-between gap-2 px-4 pt-3.5 pb-1 text-[11px] font-bold tracking-[0.1em] text-muted uppercase" +
                  (editable ? " cursor-move select-none" : "")
                }
                onPointerDown={(e) => startDrag(e, widget)}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-copper/70" />
                  <span className="truncate">{widget.label}</span>
                </span>
                {editable && (
                  <button
                    type="button"
                    className="ml-2 text-muted hover:text-red-light"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => removeWidget(widget.id)}
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex flex-1 items-center justify-center overflow-hidden p-2">
                {widget.type === "METRIC" ? (
                  <MetricValue metric={widget.metric} value={widgetData?.value} />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    {widget.type === "BAR_CHART" ? (
                      <BarChart data={widgetData?.series ?? []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                        <XAxis dataKey="label" stroke="var(--color-muted)" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--color-muted)" fontSize={11} tickLine={false} axisLine={false} width={40} />
                        <Tooltip
                          cursor={{ fill: "var(--color-copper-glow)" }}
                          contentStyle={{
                            background: "var(--color-surface2)",
                            border: "1px solid var(--color-border)",
                            borderRadius: 8,
                          }}
                        />
                        <Bar dataKey="value" fill="var(--color-copper)" radius={[6, 6, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    ) : (
                      <AreaChart data={widgetData?.series ?? []}>
                        <defs>
                          <linearGradient id={`areaFill-${widget.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--color-copper)" stopOpacity={0.28} />
                            <stop offset="100%" stopColor="var(--color-copper)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                        <XAxis dataKey="label" stroke="var(--color-muted)" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--color-muted)" fontSize={11} tickLine={false} axisLine={false} width={40} />
                        <Tooltip
                          cursor={{ stroke: "var(--color-copper-dim)", strokeWidth: 1 }}
                          contentStyle={{
                            background: "var(--color-surface2)",
                            border: "1px solid var(--color-border)",
                            borderRadius: 8,
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="var(--color-copper)"
                          strokeWidth={2.5}
                          fill={`url(#areaFill-${widget.id})`}
                          dot={false}
                          activeDot={{ r: 5, fill: "var(--color-copper)", stroke: "var(--color-background)", strokeWidth: 2 }}
                        />
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                )}
              </div>

              {editable && (
                <div
                  className="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize"
                  onPointerDown={(e) => startResize(e, widget)}
                >
                  <div className="absolute bottom-1 right-1 h-2 w-2 border-b-2 border-r-2 border-copper" />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
