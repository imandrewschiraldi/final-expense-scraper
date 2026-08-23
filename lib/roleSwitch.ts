// Lets exactly one account toggle between ADMIN and MANAGER without logging
// out, so its owner can experience both sides of the app under one identity
// — including running their own downline as a manager without giving up
// admin access, since a single account can only hold one role at a time.
// No AGENT option: MANAGER already gets every page AGENT does (plus
// Hierarchy), so there's nothing an agent view offers that manager doesn't.
// Deliberately hardcoded to a single email rather than a general feature —
// self-serve role switching isn't something every account should have.
export const ROLE_SWITCH_EMAIL = "andrewschiraldi.pinnacle@gmail.com";
export const SWITCHABLE_ROLES = ["ADMIN", "MANAGER"] as const;
export type SwitchableRole = (typeof SWITCHABLE_ROLES)[number];
