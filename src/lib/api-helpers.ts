import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import type { RangeKey } from "@/lib/stats";
import type { Role } from "@prisma/client";

const VALID_RANGES: RangeKey[] = ["24h", "7d", "30d", "90d", "all"];

export function parseRange(req: NextRequest): RangeKey {
  const raw = req.nextUrl.searchParams.get("range");
  return (VALID_RANGES as string[]).includes(raw ?? "") ? (raw as RangeKey) : "30d";
}

export async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    return { session: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session, response: null };
}

export async function requireRole(roles: Role[]) {
  const { session, response } = await requireSession();
  if (response) return { session: null, response };
  if (!roles.includes(session!.user.role)) {
    return { session: null, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session, response: null };
}
