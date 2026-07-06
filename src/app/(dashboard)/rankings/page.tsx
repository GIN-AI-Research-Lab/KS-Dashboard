import { getRankingMovement, type RangeKey, type RankingMetric } from "@/lib/stats";
import { Card } from "@/components/ui/Card";
import { RangeSelector } from "@/components/RangeSelector";
import { MetricTabs } from "@/components/MetricTabs";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { ExportLink } from "@/components/ExportLink";
import { getT } from "@/i18n/server";

const METRICS: { key: RankingMetric; labelKey: string; unitKey: string; format: "number" | "usd" | "duration" }[] = [
  { key: "totalTokens", labelKey: "metrics.totalTokens", unitKey: "metrics.unitToken", format: "number" },
  { key: "inputTokens", labelKey: "metrics.inputTop", unitKey: "metrics.unitToken", format: "number" },
  { key: "outputTokens", labelKey: "metrics.outputTop", unitKey: "metrics.unitToken", format: "number" },
  { key: "costUsd", labelKey: "metrics.costMost", unitKey: "metrics.unitUsd", format: "usd" },
  { key: "sessionDuration", labelKey: "metrics.longest", unitKey: "metrics.unitTime", format: "duration" },
  { key: "turnCount", labelKey: "metrics.mostTurns", unitKey: "metrics.unitTurns", format: "number" },
];

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; metric?: string }>;
}) {
  const { range, metric } = await searchParams;
  const r = (range ?? "30d") as RangeKey;
  const activeMetric = METRICS.find((m) => m.key === metric) ?? METRICS[0];
  const t = await getT();

  const rows = await getRankingMovement(activeMetric.key, r, 25);

  return (
    <div className="stagger flex flex-col gap-6">
      <div className="hero-panel relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-[var(--border)] p-6 shadow-[var(--shadow-xs)]">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/60 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-secondary)]">
            <span className="gradient-brand h-1.5 w-1.5 rounded-full" />
            {t("rankings.badge")}
          </span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{t("rankings.title")}</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{t("rankings.subtitle")}</p>
        </div>
        <RangeSelector defaultRange={r} />
      </div>

      <MetricTabs
        options={METRICS.map((m) => ({ key: m.key, label: t(m.labelKey) }))}
        defaultValue={METRICS[0].key}
      />

      <Card
        title={t(activeMetric.labelKey)}
        action={<ExportLink href={`/api/export/rankings?metric=${activeMetric.key}&range=${r}`} />}
      >
        <LeaderboardTable rows={rows} valueLabel={t(activeMetric.unitKey)} valueFormat={activeMetric.format} />
      </Card>
    </div>
  );
}
