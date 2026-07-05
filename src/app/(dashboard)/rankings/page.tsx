import { getRankings, type RangeKey, type RankingMetric } from "@/lib/stats";
import { Card } from "@/components/ui/Card";
import { RangeSelector } from "@/components/RangeSelector";
import { MetricTabs } from "@/components/MetricTabs";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { ExportLink } from "@/components/ExportLink";

const METRICS: { key: RankingMetric; label: string; unit: string; format: "number" | "usd" | "duration" }[] = [
  { key: "totalTokens", label: "Tổng token", unit: "token", format: "number" },
  { key: "inputTokens", label: "Top Input", unit: "token", format: "number" },
  { key: "outputTokens", label: "Top Output", unit: "token", format: "number" },
  { key: "costUsd", label: "Tốn chi phí nhất", unit: "USD", format: "usd" },
  { key: "sessionDuration", label: "Phiên lâu nhất", unit: "thời gian", format: "duration" },
  { key: "turnCount", label: "Nhiều lượt nhất", unit: "turns", format: "number" },
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
    <div className="stagger flex flex-col gap-6">
      <div className="hero-panel relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-[var(--border)] p-6 shadow-[var(--shadow-xs)]">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/60 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-secondary)]">
            <span className="gradient-brand h-1.5 w-1.5 rounded-full" />
            XẾP HẠNG
          </span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Bảng xếp <span className="gradient-text">hạng</span></h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Ai đang dùng Claude nhiều nhất công ty</p>
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
        <LeaderboardTable rows={rows} valueLabel={activeMetric.unit} valueFormat={activeMetric.format} />
      </Card>
    </div>
  );
}
