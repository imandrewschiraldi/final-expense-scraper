import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;

  const isAdminRoute = nextUrl.pathname.startsWith("/admin");
  const isAgentRoute = nextUrl.pathname.startsWith("/agent");

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  if (isAdminRoute && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/agent/dashboard", nextUrl));
  }

  if (isAgentRoute && role !== "AGENT") {
    return NextResponse.redirect(new URL("/admin/dashboard", nextUrl));
  }
});

export const config = {
  matcher: ["/admin/:path*", "/agent/:path*"],
};
