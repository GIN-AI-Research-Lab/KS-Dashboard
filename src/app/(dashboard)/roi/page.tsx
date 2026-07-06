import { getCostInsights, type RangeKey } from "@/lib/stats";
import { MINUTES_SAVED_PER_TURN, DEV_HOURLY_USD } from "@/lib/roi-config";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { RangeSelector } from "@/components/RangeSelector";
import { RankBarChart } from "@/components/charts/lazy";
import { Badge } from "@/components/ui/Badge";
import { InfoTip } from "@/components/ui/InfoTip";
import { getMetricHelp } from "@/lib/glossary";
import { getT } from "@/i18n/server";
import { formatNumber, formatUsd } from "@/lib/format";
import { DollarSign, Zap, CalendarClock, Scale } from "lucide-react";

export default async function RoiPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const r = (range ?? "30d") as RangeKey;
  const [c, t] = await Promise.all([getCostInsights(r), getT()]);
  const METRIC_HELP = getMetricHelp(t);

  const topTier = c.byTier[0];

  return (
    <div className="stagger flex flex-col gap-6">
      <div className="hero-panel relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-[var(--border)] p-6 shadow-[var(--shadow-xs)]">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/60 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-secondary)]">
            <span className="gradient-brand h-1.5 w-1.5 rounded-full" />
            {t("roi.badge")}
          </span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight"><span className="gradient-text">{t("roi.title")}</span></h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {t("roi.subtitle")}
          </p>
        </div>
        <RangeSelector defaultRange={r} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t("roi.spendLabel")} value={formatUsd(c.spendUsd)} accent="#e34948" icon={<DollarSign className="h-4 w-4" />} />
        <StatCard
          label={t("roi.cacheSavingsLabel")}
          value={formatUsd(c.cacheSavingsUsd)}
          hint={t("roi.cacheSavingsHint")}
          tooltip={t("roi.cacheSavingsTooltip")}
          accent="#008300"
          icon={<Zap className="h-4 w-4" />}
        />
        <StatCard
          label={t("roi.forecastLabel")}
          value={formatUsd(c.forecast.projectedMonthUsd)}
          hint={t("roi.forecastHint")
            .replace("{spend}", formatUsd(c.forecast.spendThisMonth))
            .replace("{elapsed}", String(c.forecast.daysElapsed))
            .replace("{total}", String(c.forecast.daysInMonth))}
          accent="#eda100"
          icon={<CalendarClock className="h-4 w-4" />}
        />
        <StatCard
          label={t("roi.roiLabel")}
          value={c.roi.roiRatio != null ? `${c.roi.roiRatio.toFixed(1)}×` : "—"}
          hint={t("roi.roiHint")}
          tooltip={METRIC_HELP.roi}
          accent="#4a3aa7"
          icon={<Scale className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title={t("roi.productivityTitle")}>
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-[var(--text-muted)]">
                {t("table.turns")}
                <InfoTip label={METRIC_HELP.turns} />
              </span>
              <span className="font-semibold tabular-nums">{formatNumber(c.roi.turnCount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">{t("roi.timeSavedLabel")}</span>
              <span className="font-semibold tabular-nums">{formatNumber(c.roi.timeSavedHours)} {t("roi.timeSavedUnit")}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">{t("roi.productivityValueLabel")}</span>
              <span className="font-semibold tabular-nums">{formatUsd(c.roi.productivityValueUsd)}</span>
            </div>
            <div className="h-px bg-[var(--gridline)]" />
            <p className="text-xs text-[var(--text-muted)]">
              {t("roi.assumptionText")
                .replace("{mins}", String(MINUTES_SAVED_PER_TURN))
                .replace("{rate}", formatUsd(DEV_HOURLY_USD))
                .replace("{file}", "src/lib/roi-config.ts")}
            </p>
          </div>
        </Card>

        <Card
          title={t("roi.costByTierTitle")}
          titleTip={t("roi.costByTierTip")}
        >
          {c.byTier.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">{t("common.noData")}</p>
          ) : (
            <>
              <RankBarChart
                data={c.byTier.map((tier) => ({ label: tier.tier, value: tier.costUsd }))}
                valueFormat="usd"
              />
              {topTier && topTier.tier === "Opus" && (
                <p className="mt-3 text-xs text-[var(--text-muted)]">
                  {t("roi.opusHint")}
                </p>
              )}
            </>
          )}
        </Card>
      </div>

      <Card
        title={t("roi.spikesTitle")}
        action={<Badge variant={c.spikes.length > 0 ? "warning" : "neutral"}>{c.spikes.length}</Badge>}
      >
        {c.spikes.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">{t("roi.noSpikes")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
                  <th className="py-2 pr-4 font-medium">{t("table.employee")}</th>
                  <th className="py-2 pr-4 text-right font-medium">{t("roi.col7d")}</th>
                  <th className="py-2 pr-4 text-right font-medium">{t("roi.colBaseline")}</th>
                  <th className="py-2 text-right font-medium">{t("roi.colIncrease")}</th>
                </tr>
              </thead>
              <tbody>
                {c.spikes.map((s) => (
                  <tr key={s.userId} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-2 pr-4 font-medium">{s.name}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{formatUsd(s.recent7)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums text-[var(--text-secondary)]">{formatUsd(s.baseline7)}</td>
                    <td className="py-2 text-right tabular-nums text-[#e34948]">
                      {isFinite(s.ratio) ? `${s.ratio.toFixed(1)}×` : t("roi.newLabel")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
