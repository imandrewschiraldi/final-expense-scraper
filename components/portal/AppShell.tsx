import { Sidebar, HEADER_HEIGHT } from "@/components/portal/Sidebar";

type Role = "ADMIN" | "MANAGER" | "AGENT";

/** Shared shell for every authenticated area (Portal, Agent, Admin) — one
 * copy of the sidebar + main content frame instead of three near-identical
 * layout files, so a shell-level fix (like the header divider below) only
 * needs to happen once. */
export function AppShell({ role, name, children }: { role: Role; name: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={role} name={name} />
      <main className="relative min-w-0 flex-1 overflow-y-auto px-6 pt-2 pb-8 lg:px-10">
        {/* Continues the sidebar header's copper line across the content
            area, at the same height. Lives inside the scrollable region
            (not viewport-fixed) so it scrolls away with the rest of the
            page instead of staying pinned over content that's scrolled
            underneath it. z-10 keeps it above embedded-tool iframes
            (Scripts/Commission Calculator), which are relatively
            positioned and would otherwise paint over it. */}
        <div
          className="pointer-events-none absolute inset-x-0 z-10 -mx-6 h-0.5 bg-copper lg:-mx-10"
          style={{ top: HEADER_HEIGHT }}
        />
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
