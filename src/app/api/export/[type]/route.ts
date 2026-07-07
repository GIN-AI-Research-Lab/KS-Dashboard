import { NextRequest, NextResponse } from "next/server";
import { requireSession, requireRole, parseRange } from "@/lib/api-helpers";
import { getRankings, getToolStats, getIngestionHealth, type RankingMetric } from "@/lib/stats";
import { toCsv, csvResponse } from "@/lib/csv";
import { getT } from "@/i18n/server";

const RANKING_METRICS: RankingMetric[] = [
  "totalTokens",
  "inputTokens",
  "outputTokens",
  "costUsd",
  "sessionDuration",
  "turnCount",
];

export async function GET(req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const range = parseRange(req);
  const t = await getT();

  if (type === "rankings") {
    const { response } = await requireSession();
    if (response) return response;

    const raw = req.nextUrl.searchParams.get("metric");
    const metric: RankingMetric = (RANKING_METRICS as string[]).includes(raw ?? "")
      ? (raw as RankingMetric)
      : "totalTokens";
    const rows = await getRankings(metric, range, 1000);
    const csv = toCsv(
      [t("api.csvRank"), t("api.csvName"), t("api.csvDepartment"), metric],
      rows.map((r, i) => [i + 1, r.userName, r.department ?? "", r.value]),
    );
    return csvResponse(`rankings-${metric}-${range}.csv`, csv);
  }

  if (type === "tools") {
    const { response } = await requireSession();
    if (response) return response;

    const { tools } = await getToolStats(range);
    const csv = toCsv(
      [t("api.csvTool"), t("api.csvCalls"), t("api.csvSuccess"), t("api.csvError"), t("api.csvErrorRate"), t("api.csvAvgTime")],
      tools.map((tool) => [
        tool.toolName,
        tool.total,
        tool.success,
        tool.error,
        (tool.errorRate * 100).toFixed(2),
        tool.avgDurationMs != null ? Math.round(tool.avgDurationMs) : "",
      ]),
    );
    return csvResponse(`tools-${range}.csv`, csv);
  }

  if (type === "health") {
    const { response } = await requireRole(["ADMIN"]);
    if (response) return response;

    const { rows } = await getIngestionHealth();
    const csv = toCsv(
      [t("api.csvName"), t("api.csvEmail"), t("api.csvSessions"), t("api.csvTurns"), t("api.csvLastEvent"), t("api.csvStatus")],
      rows.map((r) => [
        r.name,
        r.email,
        r.sessionCount,
        r.turnCount,
        r.lastEventAt ?? "",
        r.noData ? t("api.statusNoData") : r.silent ? t("api.statusSilent") : t("api.statusActive"),
      ]),
    );
    return csvResponse("ingestion-health.csv", csv);
  }

  return NextResponse.json({ error: "Unknown export type" }, { status: 400 });
}
