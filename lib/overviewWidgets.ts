// Client-safe registry of every tile the Overview page's widget grid can
// show. Admin-adjustable order/visibility lives in the OverviewWidget
// table, keyed by these same ids; a widget with no row there just uses its
// registry default (its position in this array) and stays enabled.
export type OverviewWidgetDef = { id: string; label: string };

export const OVERVIEW_WIDGET_REGISTRY: OverviewWidgetDef[] = [
  { id: "hallOfFame", label: "Hall of Fame" },
  { id: "bonusVolume", label: "Bonus Volume" },
  { id: "goals", label: "Goals" },
  // Spans the full row width wherever it lands (see OverviewClient's grid),
  // unlike every other tile here — defaults right after the three top
  // cards it was built to sit "underneath", but stays reorderable with
  // everything else above.
  { id: "calendar", label: "Training Calendar" },
  { id: "teamChat", label: "Team Chat" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "newTraining", label: "New Training" },
  { id: "recruitingRadar", label: "Recruiting Radar" },
  { id: "underwritingGenie", label: "Underwriting Genie" },
];

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
