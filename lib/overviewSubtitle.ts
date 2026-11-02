// Shared by both the admin API route (server) and SubtitleEditor (client) —
// kept dependency-free so the client component importing it never risks
// pulling in a server-only module (e.g. lib/agencySettings.ts's db import).
export const DEFAULT_OVERVIEW_SUBTITLE_TEXT = "Here's what's new across the agency since you last logged in.";
