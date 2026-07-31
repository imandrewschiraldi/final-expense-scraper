// Lets exactly one account toggle between ADMIN and AGENT without logging
// out, so its owner can experience both sides of the app under one identity.
// Deliberately hardcoded to a single email rather than a general feature —
// self-serve role switching isn't something every account should have.
export const ROLE_SWITCH_EMAIL = "andrewschiraldi.pinnacle@gmail.com";
export const SWITCHABLE_ROLES = ["ADMIN", "AGENT"] as const;
export type SwitchableRole = (typeof SWITCHABLE_ROLES)[number];
