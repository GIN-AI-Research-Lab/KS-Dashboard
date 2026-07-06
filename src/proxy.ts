import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { matchMenuByPath, canAccessPath, isDeprecatedPath } from "@/lib/menu";
import { getMenuSettings } from "@/lib/menu-config";

export default auth(async (req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const isLoginPage = pathname === "/login";

  if (!isLoggedIn && !isLoginPage) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  // URL-level access control: a route whose owning menu is hidden (private) or
  // role-restricted is blocked even when typed directly, matching the sidebar
  // the viewer would see. Admins bypass; the profile page is always reachable
  // (see canAccessPath). Only real page routes map to a menu, so API/SSE routes
  // skip the DB read entirely.
  if (isLoggedIn && !isLoginPage) {
    // Removed concepts (Projects, Teams) are not reachable by URL.
    if (isDeprecatedPath(pathname)) {
      return NextResponse.redirect(new URL("/", req.nextUrl.origin));
    }
    if (matchMenuByPath(pathname)) {
      const settings = await getMenuSettings();
      if (!canAccessPath(pathname, req.auth!.user.role, settings)) {
        return NextResponse.redirect(new URL("/", req.nextUrl.origin));
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // api/otel/* receives Claude Code's own OTel export (logs + metrics), which
    // carries no session cookie and authenticates by user.email attribute
    // instead -- see HANDOFF.md. api/ingest is the plugin hook pipeline.
    "/((?!api/ingest|api/otel|api/auth|_next/static|_next/image|icon.svg|apple-icon|opengraph-image|favicon.ico).*)",
  ],
};
