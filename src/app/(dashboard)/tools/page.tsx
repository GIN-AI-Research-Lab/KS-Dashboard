import { getToolStats, type RangeKey } from "@/lib/stats";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { RangeSelector } from "@/components/RangeSelector";
import { RankBarChart } from "@/components/charts/lazy";
import { ExportLink } from "@/components/ExportLink";
import { InfoTip } from "@/components/ui/InfoTip";
import { formatNumber, formatPercent, formatDuration } from "@/lib/format";
import { getT } from "@/i18n/server";
import { Zap, Wrench, AlertTriangle, Clock } from "lucide-react";

export default async function ToolsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const r = (range ?? "30d") as RangeKey;
  const [{ totals, tools }, t] = await Promise.all([getToolStats(r), getT()]);

  return (
    <div className="stagger flex flex-col gap-6">
      <div className="hero-panel relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-[var(--border)] p-6 shadow-[var(--shadow-xs)]">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/60 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-secondary)]">
            <span className="gradient-brand h-1.5 w-1.5 rounded-full" />
            {t("tools.badge")}
          </span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{t("tools.title")}</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{t("tools.subtitle")}</p>
        </div>
        <RangeSelector defaultRange={r} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t("tools.totalCalls")} value={formatNumber(totals.total)} accent="var(--accent)" icon={<Zap className="h-4 w-4" />} />
        <StatCard label={t("tools.uniqueTools")} value={formatNumber(totals.uniqueTools)} accent="#4a3aa7" icon={<Wrench className="h-4 w-4" />} />
        <StatCard
          label={t("tools.errorRate")}
          tooltip={t("tools.errorRateTip")}
          value={formatPercent(totals.errorRate)}
          hint={`${formatNumber(totals.errorTotal)} ${t("tools.errorCountHint")}`}
          accent="#e34948"
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <StatCard
          label={t("tools.avgTime")}
          tooltip={t("tools.avgTimeTip")}
          value={totals.avgDurationMs != null ? formatDuration(totals.avgDurationMs) : "—"}
          accent="#1baf7a"
          icon={<Clock className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card title={t("tools.topByCalls")} className="xl:col-span-1">
          <RankBarChart
            data={tools.slice(0, 12).map((t) => ({ label: t.toolName, value: t.total }))}
            valueFormat="number"
          />
        </Card>

        <Card
          title={t("tools.detail")}
          className="xl:col-span-2"
          action={<ExportLink href={`/api/export/tools?range=${r}`} />}
        >
          {tools.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">{t("tools.noData")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
                    <th className="py-2 pr-4 font-medium">{t("tools.colTool")}</th>
                    <th className="py-2 pr-4 text-right font-medium">{t("tools.colCalls")}</th>
                    <th className="py-2 pr-4 text-right font-medium">{t("tools.colSuccess")}</th>
                    <th className="py-2 pr-4 text-right font-medium">{t("tools.colError")}</th>
                    <th className="py-2 pr-4 text-right font-medium">{t("tools.errorRate")}</th>
                    <th className="py-2 text-right font-medium">
                      <span className="inline-flex items-center gap-1">{t("tools.avgTime")}<InfoTip label={t("tools.avgTimeTip")} /></span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tools.map((t) => (
                    <tr key={t.toolName} className="border-b border-[var(--border)] last:border-0">
                      <td className="py-2 pr-4 font-mono text-[13px]">{t.toolName}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{formatNumber(t.total)}</td>
                      <td className="py-2 pr-4 text-right tabular-nums text-[var(--text-secondary)]">
                        {formatNumber(t.success)}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        <span className={t.error > 0 ? "text-[#e34948]" : "text-[var(--text-muted)]"}>
                          {formatNumber(t.error)}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        <span className={t.errorRate > 0.1 ? "text-[#e34948]" : "text-[var(--text-secondary)]"}>
                          {formatPercent(t.errorRate)}
                        </span>
                      </td>
                      <td className="py-2 text-right tabular-nums text-[var(--text-secondary)]">
                        {t.avgDurationMs != null ? formatDuration(t.avgDurationMs) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
