import { NextRequest, NextResponse } from "next/server";
import { requireSession, requireRole, parseRange } from "@/lib/api-helpers";
import { getRankings, getToolStats, getIngestionHealth, type RankingMetric } from "@/lib/stats";
import { toCsv, csvResponse } from "@/lib/csv";

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

  if (type === "rankings") {
    const { response } = await requireSession();
    if (response) return response;

    const raw = req.nextUrl.searchParams.get("metric");
    const metric: RankingMetric = (RANKING_METRICS as string[]).includes(raw ?? "")
      ? (raw as RankingMetric)
      : "totalTokens";
    const rows = await getRankings(metric, range, 1000);
    const csv = toCsv(
      ["Hạng", "Tên", "Nhóm", "Bộ phận", metric],
      rows.map((r, i) => [i + 1, r.userName, r.team ?? "", r.department ?? "", r.value]),
    );
    return csvResponse(`rankings-${metric}-${range}.csv`, csv);
  }

  if (type === "tools") {
    const { response } = await requireSession();
    if (response) return response;

    const { tools } = await getToolStats(range);
    const csv = toCsv(
      ["Công cụ", "Lượt gọi", "Thành công", "Lỗi", "Tỷ lệ lỗi (%)", "Thời gian TB (ms)"],
      tools.map((t) => [
        t.toolName,
        t.total,
        t.success,
        t.error,
        (t.errorRate * 100).toFixed(2),
        t.avgDurationMs != null ? Math.round(t.avgDurationMs) : "",
      ]),
    );
    return csvResponse(`tools-${range}.csv`, csv);
  }

  if (type === "health") {
    const { response } = await requireRole(["ADMIN"]);
    if (response) return response;

    const { rows } = await getIngestionHealth();
    const csv = toCsv(
      ["Tên", "Email", "Phiên", "Turns", "Sự kiện gần nhất", "Trạng thái"],
      rows.map((r) => [
        r.name,
        r.email,
        r.sessionCount,
        r.turnCount,
        r.lastEventAt ?? "",
        r.noData ? "Chưa có dữ liệu" : r.silent ? "Im lặng" : "Hoạt động",
      ]),
    );
    return csvResponse("ingestion-health.csv", csv);
  }

  return NextResponse.json({ error: "Unknown export type" }, { status: 400 });
}
