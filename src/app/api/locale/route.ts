import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { LOCALE_COOKIE, isLocale } from "@/i18n/config";

// Persist the viewer's UI language: set the cookie used for server-side locale
// resolution and mirror it onto the account (best-effort) so it follows them.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const raw = (body as { locale?: unknown } | null)?.locale;
  const locale = typeof raw === "string" ? raw : undefined;
  if (!isLocale(locale)) {
    return NextResponse.json({ error: "Invalid locale" }, { status: 422 });
  }

  const res = NextResponse.json({ ok: true, locale });
  res.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: "lax",
  });

  const session = await auth();
  if (session?.user?.id) {
    await prisma.user
      .update({ where: { id: session.user.id }, data: { locale } })
      .catch(() => {
        // best-effort; the cookie is the effective source for rendering
      });
  }

  return res;
}
