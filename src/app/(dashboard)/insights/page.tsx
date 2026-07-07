import { getInsightsStats, getToolSankey, getDepartmentModelPivot, getCodeStats, getTaskCategoryStats, type RangeKey } from "@/lib/stats";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { RangeSelector } from "@/components/RangeSelector";
import { RankBarChart, ToolSankey } from "@/components/charts/lazy";
import { formatNumber, formatUsd, formatDuration, formatPercent, formatDay, formatRelativeTime } from "@/lib/format";
import { colorForModel } from "@/lib/chart-colors";
import { getMetricHelp } from "@/lib/glossary";
import { getT } from "@/i18n/server";
import { Plus, Minus, Check, AlertTriangle, TrendingUp } from "lucide-react";

function PercentileRow({ label, ms }: { label: string; ms: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[var(--text-muted)]">{label}</span>
      <span className="font-semibold tabular-nums">{formatDuration(ms)}</span>
    </div>
  );
}

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const r = (range ?? "30d") as RangeKey;
  const [s, sankey, pivot, code, taskCat, t] = await Promise.all([
    getInsightsStats(r),
    getToolSankey(r),
    getDepartmentModelPivot(r),
    getCodeStats(r),
    getTaskCategoryStats(r),
    getT(),
  ]);
  const METRIC_HELP = getMetricHelp(t);

  return (
    <div className="stagger flex flex-col gap-6">
      <div className="hero-panel relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-[var(--border)] p-6 shadow-[var(--shadow-xs)]">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/60 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-secondary)]">
            <span className="gradient-brand h-1.5 w-1.5 rounded-full" />
            {t("insights.badge")}
          </span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight"><span className="gradient-text">{t("insights.title")}</span></h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {t("insights.subtitle")}
          </p>
        </div>
        <RangeSelector defaultRange={r} />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          {t("insights.techQualityHeading")}
        </h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label={t("overview.linesAdded")} value={formatNumber(code.linesAdded)} tooltip={METRIC_HELP.linesAdded} accent="#008300" icon={<Plus className="h-4 w-4" />} />
          <StatCard label={t("overview.linesRemoved")} value={formatNumber(code.linesRemoved)} tooltip={METRIC_HELP.linesRemoved} accent="#e34948" icon={<Minus className="h-4 w-4" />} />
          <StatCard
            label={t("overview.acceptanceRate")}
            value={code.editsAccepted + code.editsRejected > 0 ? formatPercent(code.acceptanceRate) : "—"}
            hint={`${code.editsAccepted}/${code.editsAccepted + code.editsRejected} ${t("insights.acceptedSuffix")}`}
            tooltip={METRIC_HELP.acceptanceRate}
            accent="var(--accent)"
            icon={<Check className="h-4 w-4" />}
          />
          <StatCard label={t("insights.apiErrorsLabel")} value={formatNumber(code.apiErrors)} tooltip={t("insights.apiErrorsTooltip")} accent="#eb6834" icon={<AlertTriangle className="h-4 w-4" />} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          title={t("insights.apiLatencyTitle").replace("{count}", formatNumber(code.apiLatency.count))}
          titleTip={t("insights.apiLatencyTip")}
        >
          <div className="flex flex-col gap-2">
            <PercentileRow label={t("insights.p50Label")} ms={code.apiLatency.p50} />
            <PercentileRow label={t("insights.p90Label")} ms={code.apiLatency.p90} />
            <PercentileRow label={t("insights.p99Label")} ms={code.apiLatency.p99} />
          </div>
        </Card>
        <Card
          title={t("insights.ttftTitle").replace("{count}", formatNumber(code.ttft.count))}
          titleTip={t("insights.ttftTip")}
        >
          <div className="flex flex-col gap-2">
            <PercentileRow label={t("insights.p50Label")} ms={code.ttft.p50} />
            <PercentileRow label={t("insights.p90Label")} ms={code.ttft.p90} />
            <PercentileRow label={t("insights.p99Label")} ms={code.ttft.p99} />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card
          title={t("insights.toolLatencyTitle").replace("{count}", formatNumber(s.toolLatency.count))}
          titleTip={t("insights.toolLatencyTip")}
        >
          <div className="flex flex-col gap-2">
            <PercentileRow label={t("insights.p50Label")} ms={s.toolLatency.p50} />
            <PercentileRow label={t("insights.p90Label")} ms={s.toolLatency.p90} />
            <PercentileRow label={t("insights.p99Label")} ms={s.toolLatency.p99} />
          </div>
        </Card>

        <Card
          title={t("insights.sessionDurationTitle").replace("{count}", formatNumber(s.sessionDuration.count))}
          titleTip={t("insights.sessionDurationTip")}
        >
          <div className="flex flex-col gap-2">
            <PercentileRow label={t("insights.p50Label")} ms={s.sessionDuration.p50} />
            <PercentileRow label={t("insights.p90Label")} ms={s.sessionDuration.p90} />
            <PercentileRow label={t("insights.p99Label")} ms={s.sessionDuration.p99} />
          </div>
        </Card>

        <StatCard
          label={t("insights.peakConcurrencyLabel")}
          tooltip={t("insights.peakConcurrencyTip")}
          value={formatNumber(s.peakConcurrency.peak)}
          hint={s.peakConcurrency.peakAt ? `${t("insights.peakAtPrefix")} ${formatRelativeTime(s.peakConcurrency.peakAt)}` : undefined}
          accent="#e34948"
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title={t("insights.sessionSourceTitle")}>
          <RankBarChart data={s.bySource.map((x) => ({ label: x.source, value: x.count }))} valueFormat="number" />
        </Card>
        <Card
          title={t("insights.stopReasonTitle")}
          titleTip={t("insights.stopReasonTip")}
        >
          <RankBarChart data={s.byStopReason.map((x) => ({ label: x.stopReason, value: x.count }))} valueFormat="number" />
        </Card>
      </div>

      <Card
        title={t("overview.taskCategoryTitle")}
        titleTip={t("insights.taskCategoryTip")}
      >
        {taskCat.rows.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">{t("common.noData")}</p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
                    <th className="py-2 pr-4 font-medium">{t("overview.colType")}</th>
                    <th className="py-2 pr-4 text-right font-medium">{t("overview.colSessions")}</th>
                    <th className="py-2 pr-4 text-right font-medium">{t("overview.colRatio")}</th>
                    <th className="py-2 pr-4 text-right font-medium">{t("overview.colTokens")}</th>
                    <th className="py-2 text-right font-medium">{t("overview.colCost")}</th>
                  </tr>
                </thead>
                <tbody>
                  {taskCat.rows.map((row) => (
                    <tr key={row.category} className="border-b border-[var(--border)] last:border-0">
                      <td className="py-2 pr-4 font-medium">{t(`taskCategory.${row.category}`)}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{formatNumber(row.sessions)}</td>
                      <td className="py-2 pr-4 text-right tabular-nums text-[var(--text-secondary)]">
                        {formatPercent(row.sessions / taskCat.totalSessions)}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">{formatNumber(row.totalTokens)}</td>
                      <td className="py-2 text-right tabular-nums">{formatUsd(row.costUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              {t("overview.taskCategoryFooter")
                .replace("{tagged}", String(taskCat.totalTaggedSessions))
                .replace("{total}", String(taskCat.totalSessions))}
            </p>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title={t("insights.durationDistributionTitle")}>
          <RankBarChart data={s.durationHistogram.map((h) => ({ label: h.label, value: h.count }))} valueFormat="number" />
        </Card>

        <Card
          title={t("insights.pivotTitle")}
          titleTip={t("insights.pivotTip")}
        >
          {pivot.rows.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">{t("common.noData")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                    <th className="px-2 py-1 text-left font-medium">{t("table.department")}</th>
                    {pivot.models.map((m) => (
                      <th key={m} className="px-2 py-1 text-right font-medium">{m}</th>
                    ))}
                    <th className="px-2 py-1 text-right font-medium">{t("insights.pivotTotalCol")}</th>
                  </tr>
                </thead>
                <tbody>
                  {pivot.rows.map((row) => (
                    <tr key={row.department} className="border-b border-[var(--border)] last:border-0">
                      <td className="px-2 py-1">{row.department}</td>
                      {row.cells.map((c, k) => (
                        <td key={k} className="px-2 py-1 text-right tabular-nums text-[var(--text-secondary)]">
                          {c > 0 ? formatNumber(c) : "—"}
                        </td>
                      ))}
                      <td className="px-2 py-1 text-right font-medium tabular-nums">{formatNumber(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Card title={t("insights.sankeyTitle")}>
        <ToolSankey nodes={sankey.nodes} links={sankey.links} />
      </Card>

      <Card title={t("insights.modelMixTitle")}>
        {s.modelMix.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">{t("common.noData")}</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-3">
              {s.topModels.map((m) => (
                <span key={m} className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorForModel(m) }} />
                  {m}
                </span>
              ))}
            </div>
            <div className="flex flex-col gap-2.5">
              {s.modelMix.map((w) => (
                <div key={w.week}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-medium">{formatDay(w.week)}</span>
                    <span className="text-[var(--text-muted)]">{formatNumber(w.total)} {t("insights.tokenSuffix")}</span>
                  </div>
                  <div className="flex h-4 w-full overflow-hidden rounded-md bg-black/5 dark:bg-white/10">
                    {w.segments.map((seg) => (
                      <div
                        key={seg.model}
                        title={`${seg.model}: ${formatPercent(seg.pct)}`}
                        style={{ width: `${seg.pct * 100}%`, background: colorForModel(seg.model) }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
