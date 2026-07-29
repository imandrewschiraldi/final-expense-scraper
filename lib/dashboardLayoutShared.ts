import type { MetricKey } from "@/lib/dashboardMetricsShared";

export type WidgetType = "METRIC" | "BAR_CHART" | "LINE_CHART";

export type Widget = {
  id: string;
  type: WidgetType;
  metric: MetricKey;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export const GRID_COLUMNS = 12;

export const DEFAULT_WIDGETS: Widget[] = [
  { id: "w1", type: "METRIC", metric: "issuedAP", label: "Issued AP", x: 0, y: 0, w: 4, h: 2 },
  { id: "w2", type: "METRIC", metric: "issuedCount", label: "Policies Issued", x: 4, y: 0, w: 4, h: 2 },
  { id: "w3", type: "METRIC", metric: "conversionRate", label: "Conversion Rate", x: 8, y: 0, w: 4, h: 2 },
  { id: "w4", type: "LINE_CHART", metric: "issuedAP", label: "Issued AP Trend", x: 0, y: 2, w: 12, h: 4 },
];
