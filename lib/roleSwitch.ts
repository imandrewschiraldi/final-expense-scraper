// Lets exactly one account toggle between ADMIN, MANAGER, and AGENT without
// logging out, so its owner can experience every side of the app under one
// identity — including running their own downline as a manager without
// giving up admin access, since a single account can only hold one role at
// a time. Deliberately hardcoded to a single email rather than a general
// feature — self-serve role switching isn't something every account should
// have.
export const ROLE_SWITCH_EMAIL = "andrewschiraldi.pinnacle@gmail.com";
export const SWITCHABLE_ROLES = ["ADMIN", "MANAGER", "AGENT"] as const;
export type SwitchableRole = (typeof SWITCHABLE_ROLES)[number];
