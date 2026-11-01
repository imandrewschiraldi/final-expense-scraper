// Client-safe registry of every tile the Overview page's widget grid can
// show — the 3 original built-in widgets plus one tile per pre-built agency
// metric (reusing the exact same keys/labels the Agency Dashboard's KPI
// grid already computes, so a new metric only needs adding there, not
// redefined here). Admin-adjustable order/visibility lives in the
// OverviewWidget table, keyed by these same ids; a widget with no row there
// just uses its registry default (its position in this array) and stays
// enabled.
import { AGENCY_KPI_KEYS, AGENCY_KPI_META, AgencyKpiKey } from "@/lib/agencyDashboardShared";

export const METRIC_ID_PREFIX = "metric:";

export function metricWidgetId(key: AgencyKpiKey): string {
  return `${METRIC_ID_PREFIX}${key}`;
}

export function metricKeyFromWidgetId(id: string): AgencyKpiKey | null {
  if (!id.startsWith(METRIC_ID_PREFIX)) return null;
  const key = id.slice(METRIC_ID_PREFIX.length);
  return (AGENCY_KPI_KEYS as readonly string[]).includes(key) ? (key as AgencyKpiKey) : null;
}

export type OverviewWidgetDef = { id: string; label: string };

const BUILTIN_WIDGETS: OverviewWidgetDef[] = [
  { id: "hallOfFame", label: "Hall of Fame" },
  { id: "teamChat", label: "Team Chat" },
  { id: "newTraining", label: "New Training" },
];

const METRIC_WIDGETS: OverviewWidgetDef[] = AGENCY_KPI_KEYS.map((key) => ({
  id: metricWidgetId(key),
  label: AGENCY_KPI_META[key].label,
}));

/** Default order is this array's own order. */
export const OVERVIEW_WIDGET_REGISTRY: OverviewWidgetDef[] = [...BUILTIN_WIDGETS, ...METRIC_WIDGETS];

export type ResolvedOverviewWidget = OverviewWidgetDef & { order: number; enabled: boolean };

/** Merges the fixed registry with admin overrides (order/enabled rows that
 *  only exist once something was actually changed from its default), sorted
 *  for display. */
export function resolveOverviewLayout(overrides: Map<string, { order: number; enabled: boolean }>): ResolvedOverviewWidget[] {
  return OVERVIEW_WIDGET_REGISTRY.map((def, index) => {
    const override = overrides.get(def.id);
    return { ...def, order: override?.order ?? index, enabled: override?.enabled ?? true };
  }).sort((a, b) => a.order - b.order);
}
