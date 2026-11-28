// The F90 S.O.P. page (agent and admin) is the one page whose overlay card
// is always a white, light-theme page regardless of the agency's selected
// dark/light/green theme — see AppShell's use of overlay-card-surface-light
// in globals.css. Every other page keeps following the selected theme.
export const F90_ROUTE_PREFIXES = ["/f90", "/admin/f90"];

export function isF90Route(pathname: string): boolean {
  return F90_ROUTE_PREFIXES.some((p) => pathname.startsWith(p));
}
