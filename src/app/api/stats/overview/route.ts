import { NextRequest, NextResponse } from "next/server";
import { requireSession, parseRange } from "@/lib/api-helpers";
import { getOverviewStats } from "@/lib/stats";

export async function GET(req: NextRequest) {
  const { response } = await requireSession();
  if (response) return response;

  const data = await getOverviewStats(parseRange(req));
  return NextResponse.json(data);
}
