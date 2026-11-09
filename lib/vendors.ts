/** Stable per-vendor id for anchors/query params — just the name, URL-safe.
 *  Vendor data itself lives in the database (LeadVendor model), managed from
 *  /admin/lead-vendors — this is the one bit of vendor logic still shared
 *  between the agent-facing grid (components/portal/BuyLeadsGrid.tsx) and
 *  the global-search API route without either needing to import the other. */
export function vendorSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
