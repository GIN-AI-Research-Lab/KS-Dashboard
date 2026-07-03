import { getRankings, type RangeKey, type RankingMetric } from "@/lib/stats";
import { Card } from "@/components/ui/Card";
import { RangeSelector } from "@/components/RangeSelector";
import { MetricTabs } from "@/components/MetricTabs";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { ExportLink } from "@/components/ExportLink";
import { formatNumber, formatUsd, formatDuration } from "@/lib/format";

const METRICS: { key: RankingMetric; label: string; unit: string; formatter: (n: number) => string }[] = [
  { key: "totalTokens", label: "Tổng token", unit: "token", formatter: formatNumber },
  { key: "inputTokens", label: "Top Input", unit: "token", formatter: formatNumber },
  { key: "outputTokens", label: "Top Output", unit: "token", formatter: formatNumber },
  { key: "costUsd", label: "Tốn chi phí nhất", unit: "USD", formatter: formatUsd },
  { key: "sessionDuration", label: "Phiên lâu nhất", unit: "thời gian", formatter: formatDuration },
  { key: "turnCount", label: "Nhiều lượt nhất", unit: "turns", formatter: formatNumber },
];

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; metric?: string }>;
}) {
  const { range, metric } = await searchParams;
  const r = (range ?? "30d") as RangeKey;
  const activeMetric = METRICS.find((m) => m.key === metric) ?? METRICS[0];

  const rows = await getRankings(activeMetric.key, r, 25);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Bảng xếp hạng</h1>
          <p className="text-sm text-[var(--text-muted)]">Ai đang dùng Claude nhiều nhất công ty</p>
        </div>
        <RangeSelector defaultRange={r} />
      </div>

      <MetricTabs
        options={METRICS.map((m) => ({ key: m.key, label: m.label }))}
        defaultValue={METRICS[0].key}
      />

      <Card
        title={activeMetric.label}
        action={<ExportLink href={`/api/export/rankings?metric=${activeMetric.key}&range=${r}`} />}
      >
        <LeaderboardTable rows={rows} valueLabel={activeMetric.unit} valueFormatter={activeMetric.formatter} />
      </Card>
    </div>
  );
}
