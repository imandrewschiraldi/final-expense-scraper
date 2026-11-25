// AppShell fetches the agency-wide "overlay card" beta flag once on mount
// (see AppShell.tsx) rather than subscribing to it live, so flipping the
// toggle on the Profile page had no visible effect until the next full page
// load. This custom event lets ProfilePanel push the new value straight to
// AppShell the moment the toggle succeeds, no reload needed.
export const CARD_LAYOUT_CHANGED_EVENT = "tier1:card-layout-changed";

export function dispatchCardLayoutChanged(enabled: boolean) {
  window.dispatchEvent(
    new CustomEvent<boolean>(CARD_LAYOUT_CHANGED_EVENT, { detail: enabled }),
  );
}
