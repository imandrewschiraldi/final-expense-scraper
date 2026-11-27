"use client";

// Every page fills whatever width the browser window actually is — a 34"
// monitor gets a 34" page, same as any other dashboard-style app — with
// just a small fixed gutter on each side. This replaced an opt-in "wide
// mode" that capped out at 1800px even turned on, and defaulted to a
// 1152px centered column otherwise: both left large stretches of a wide
// monitor empty no matter what.
export function ContentContainer({ children }: { children: React.ReactNode }) {
  return <div className="w-full px-4 sm:px-6">{children}</div>;
}
