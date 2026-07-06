import { getAdoptionStats, getCohortRetention, type RangeKey, type AdoptionPhase } from "@/lib/stats";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { RangeSelector } from "@/components/RangeSelector";
import { TrendChart, RankBarChart } from "@/components/charts/lazy";
import { Badge, Tag } from "@/components/ui/Badge";
import { formatNumber, formatPercent, formatDay } from "@/lib/format";
import { getMetricHelp } from "@/lib/glossary";
import { colorForIndex } from "@/lib/chart-colors";
import { ANNOTATIONS } from "@/lib/annotations";
import { getT } from "@/i18n/server";
import { Activity, CalendarDays, CalendarRange, Repeat } from "lucide-react";

export default async function AdoptionPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const r = (range ?? "30d") as RangeKey;
  const [a, cohort, t] = await Promise.all([getAdoptionStats(r), getCohortRetention(8), getT()]);
  const METRIC_HELP = getMetricHelp(t);

  const PHASE_LABELS: Record<AdoptionPhase, string> = {
    power: t("adoption.phasePower"),
    regular: t("adoption.phaseRegular"),
    trial: t("adoption.phaseTrial"),
    inactive: t("adoption.phaseInactive"),
  };

  return (
    <div className="stagger flex flex-col gap-6">
      <div className="hero-panel relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-[var(--border)] p-6 shadow-[var(--shadow-xs)]">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/60 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-secondary)]">
            <span className="gradient-brand h-1.5 w-1.5 rounded-full" />
            {t("adoption.badge")}
          </span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{t("adoption.title")}</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{t("adoption.subtitle")}</p>
        </div>
        <RangeSelector defaultRange={r} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t("adoption.avgDau")} tooltip={t("adoption.avgDauTip")} value={formatNumber(a.current.avgDau)} hint={t("adoption.last28")} accent="#2a78d6" icon={<Activity className="h-4 w-4" />} />
        <StatCard label="WAU" tooltip={t("adoption.wauTip")} value={formatNumber(a.current.wau)} hint={t("adoption.last7")} accent="#1baf7a" icon={<CalendarDays className="h-4 w-4" />} />
        <StatCard label="MAU" tooltip={t("adoption.mauTip")} value={formatNumber(a.current.mau)} hint={t("adoption.last28")} accent="#4a3aa7" icon={<CalendarRange className="h-4 w-4" />} />
        <StatCard
          label={t("adoption.stickiness")}
          tooltip={t("adoption.stickinessTip")}
          value={formatPercent(a.current.stickiness)}
          hint={t("adoption.stickinessHint")}
          accent="#eda100"
          icon={<Repeat className="h-4 w-4" />}
        />
      </div>

      <Card title={t("adoption.dauCard")} titleTip={t("adoption.dauCardTip")}>
        <TrendChart
          data={a.dauSeries}
          series={[{ key: "users", label: t("adoption.usersSeries"), color: "#2a78d6" }]}
          annotations={ANNOTATIONS}
        />
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title={t("adoption.phaseDist")}>
          <RankBarChart
            data={(Object.keys(a.phases) as AdoptionPhase[]).map((k) => ({
              label: PHASE_LABELS[k],
              value: a.phases[k],
            }))}
            valueFormat="number"
          />
        </Card>

        <Card
          title={t("adoption.coverage")}
          titleTip={METRIC_HELP.coverage}
          action={
            <span className="text-xs text-[var(--text-muted)]">
              {t("adoption.companyWide")}: {a.coverage.activeInRange}/{a.coverage.totalUsers} ({formatPercent(a.coverage.pct)})
            </span>
          }
        >
          {a.coverage.byDepartment.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">{t("adoption.noData")}</p>
          ) : (
            <div className="flex flex-col gap-3">
              {a.coverage.byDepartment.map((d, i) => (
                <div key={d.department}>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span className="font-medium">{d.department}</span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {d.active}/{d.total} · {formatPercent(d.pct)}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${d.pct * 100}%`, background: colorForIndex(i) }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title={t("adoption.funnel")}>
          <div className="flex flex-col gap-3">
            {a.funnel.map((f, i) => {
              const pct = a.funnel[0].count > 0 ? f.count / a.funnel[0].count : 0;
              return (
                <div key={f.stage}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{f.stage}</span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {formatNumber(f.count)} · {formatPercent(pct)}
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded bg-black/5 dark:bg-white/10">
                    <div className="h-full rounded" style={{ width: `${pct * 100}%`, background: colorForIndex(i) }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title={t("adoption.retention")} titleTip={t("adoption.retentionTip")}>
          {cohort.rows.every((r2) => r2.size === 0) ? (
            <p className="text-sm text-[var(--text-muted)]">{t("adoption.notEnough")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="text-xs">
                <thead>
                  <tr className="text-[var(--text-muted)]">
                    <th className="px-2 py-1 text-left font-medium">{t("adoption.colCohort")}</th>
                    <th className="px-2 py-1 text-right font-medium">{t("adoption.colSize")}</th>
                    {Array.from({ length: cohort.maxOffset + 1 }, (_, k) => (
                      <th key={k} className="px-2 py-1 text-center font-medium">T+{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cohort.rows.map((row) => (
                    <tr key={row.cohort}>
                      <td className="px-2 py-1 whitespace-nowrap">{formatDay(row.cohort)}</td>
                      <td className="px-2 py-1 text-right tabular-nums">{row.size}</td>
                      {row.cells.map((c, k) => (
                        <td
                          key={k}
                          className="px-2 py-1 text-center tabular-nums"
                          style={{ background: c != null ? `rgba(42,120,214,${0.08 + 0.8 * c})` : "transparent" }}
                        >
                          {c != null ? formatPercent(c, 0) : ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card title={t("adoption.powerUsers")}>
          {a.powerUsers.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">{t("adoption.none")}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {a.powerUsers.map((u) => (
                <div key={u.userId} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{u.name}</span>
                  <span className="text-xs text-[var(--text-muted)]">{u.activeDays} {t("adoption.daysOf28")}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card
          title={t("adoption.newUsers")}
          action={<Badge variant="good">{a.newAdopters.length}</Badge>}
        >
          {a.newAdopters.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">{t("adoption.noneInPeriod")}</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {a.newAdopters.slice(0, 20).map((u) => (
                <Tag key={u.userId}>{u.name}</Tag>
              ))}
            </div>
          )}
        </Card>

        <Card
          title={t("adoption.churned")}
          action={<Badge variant={a.churned.length > 0 ? "critical" : "neutral"}>{a.churned.length}</Badge>}
        >
          {a.churned.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">{t("adoption.none")}</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {a.churned.slice(0, 20).map((u) => (
                <Tag key={u.userId}>{u.name}</Tag>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
