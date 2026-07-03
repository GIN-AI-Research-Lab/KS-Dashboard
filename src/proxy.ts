import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
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

  return NextResponse.next();
});

export const config = {
  matcher: [
    // api/otel/* receives Claude Code's own OTel export (logs + metrics), which
    // carries no session cookie and authenticates by user.email attribute
    // instead -- see HANDOFF.md. api/ingest is the plugin hook pipeline.
    "/((?!api/ingest|api/otel|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
