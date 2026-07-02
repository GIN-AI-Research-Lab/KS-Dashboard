import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-helpers";
import { getRecentSessions } from "@/lib/stats";

export async function GET(req: NextRequest) {
  const { response } = await requireSession();
  if (response) return response;

  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 50), 200);
  const data = await getRecentSessions(limit);
  return NextResponse.json({ data });
}
