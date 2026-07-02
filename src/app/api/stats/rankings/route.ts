import { NextRequest, NextResponse } from "next/server";
import { requireSession, parseRange } from "@/lib/api-helpers";
import { getRankings, type RankingMetric } from "@/lib/stats";

const VALID_METRICS: RankingMetric[] = [
  "totalTokens",
  "inputTokens",
  "outputTokens",
  "costUsd",
  "sessionDuration",
  "turnCount",
];

export async function GET(req: NextRequest) {
  const { response } = await requireSession();
  if (response) return response;

  const rawMetric = req.nextUrl.searchParams.get("metric");
  const metric: RankingMetric = (VALID_METRICS as string[]).includes(rawMetric ?? "")
    ? (rawMetric as RankingMetric)
    : "totalTokens";
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 10), 50);

  const data = await getRankings(metric, parseRange(req), limit);
  return NextResponse.json({ metric, data });
}
