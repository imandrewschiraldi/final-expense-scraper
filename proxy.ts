import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;

  // Recruiting Radar and Job Applications are /admin pages non-admins can
  // reach — each gated by its own page-level check (Recruiting Radar: ADMIN
  // always in, AGENT/MANAGER only with recruitingRadarEnabled; Job
  // Applications: ADMIN or MANAGER) rather than the blanket admin-only rule
  // below.
  const ADMIN_ROUTE_EXCEPTIONS = ["/admin/recruiting-radar", "/admin/job-applications"];
  const isAdminRoute =
    nextUrl.pathname.startsWith("/admin") && !ADMIN_ROUTE_EXCEPTIONS.some((p) => nextUrl.pathname.startsWith(p));
  const isAgentRoute = nextUrl.pathname.startsWith("/agent");

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  if (isAdminRoute && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/portal/dashboard", nextUrl));
  }

  if (isAgentRoute && role !== "AGENT" && role !== "MANAGER") {
    return NextResponse.redirect(new URL("/portal/dashboard", nextUrl));
  }
});

export const config = {
  matcher: ["/admin/:path*", "/agent/:path*"],
};
