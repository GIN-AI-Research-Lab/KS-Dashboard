import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getUserStats, getUserGamification, getDepartmentAverages, getUserCodeStats, getTaskCategoryStats, type RangeKey } from "@/lib/stats";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { RangeSelector } from "@/components/RangeSelector";
import { TrendChart } from "@/components/charts/lazy";
import { Tag } from "@/components/ui/Badge";
import { BadgeGrid } from "@/components/BadgeGrid";
import { Avatar } from "@/components/Avatar";
import { formatNumber, formatUsd, formatPercent } from "@/lib/format";
import { colorForIndex } from "@/lib/chart-colors";
import { getMetricHelp } from "@/lib/glossary";
import { getT } from "@/i18n/server";
import { InfoTip } from "@/components/ui/InfoTip";
import {
  Sigma,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  Flame,
  CalendarDays,
  Divide,
  RotateCw,
  Plus,
  Minus,
  Check,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

export default async function MePage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range } = await searchParams;
  const r = (range ?? "30d") as RangeKey;
  const [session, t] = await Promise.all([auth(), getT()]);
  const METRIC_HELP = getMetricHelp(t);

  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    include: { department: true },
  });
  if (!user) return null;

  const [stats, gami, deptCmp, code, taskCat] = await Promise.all([
    getUserStats(user.id, r),
    getUserGamification(user.id),
    user.departmentId ? getDepartmentAverages(user.departmentId, r) : Promise.resolve(null),
    getUserCodeStats(user.id, r),
    getTaskCategoryStats(r, user.id),
  ]);
  const streak = gami.streak;

  const recapDeltaTokens =
    gami.recap.lastWeek.tokens > 0
      ? ((gami.recap.thisWeek.tokens - gami.recap.lastWeek.tokens) / gami.recap.lastWeek.tokens) * 100
      : null;

  const activeDays = stats.daily.length;
  const tokensPerTurn = stats.totals.turnCount > 0 ? stats.totals.totalTokens / stats.totals.turnCount : 0;

  const comparisons = deptCmp
    ? ([
        { label: t("overview.totalTokens"), you: stats.totals.totalTokens, avg: deptCmp.avg.totalTokens, fmt: formatNumber },
        { label: t("table.cost"), you: stats.totals.costUsd, avg: deptCmp.avg.costUsd, fmt: formatUsd },
        { label: t("table.turns"), you: stats.totals.turnCount, avg: deptCmp.avg.turnCount, fmt: formatNumber },
      ] as const)
    : [];

  return (
    <div className="stagger flex flex-col gap-6">
      <div className="hero-panel relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-[var(--border)] p-6 shadow-[var(--shadow-xs)]">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar image={user.image} name={user.name} className="h-16 w-16 ring-2 ring-[var(--border)]" iconClassName="h-8 w-8" />
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/60 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-secondary)]">
              <span className="gradient-brand h-1.5 w-1.5 rounded-full" />
              {t("me.badge")}
            </span>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              <span className="gradient-text">{user.name}</span>
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {t(`roles.${user.role}`)}
              {user.department ? ` · ${user.department.name}` : ""}
            </p>
          </div>
        </div>
        <RangeSelector defaultRange={r} />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label={t("overview.totalTokens")} value={formatNumber(stats.totals.totalTokens)} tooltip={METRIC_HELP.totalTokens} accent="#2a78d6" icon={<Sigma className="h-4 w-4" />} />
        <StatCard label={t("table.input")} value={formatNumber(stats.totals.inputTokens)} tooltip={METRIC_HELP.inputTokens} accent="#1baf7a" icon={<ArrowRight className="h-4 w-4" />} />
        <StatCard label={t("table.output")} value={formatNumber(stats.totals.outputTokens)} tooltip={METRIC_HELP.outputTokens} accent="#eb6834" icon={<ArrowLeft className="h-4 w-4" />} />
        <StatCard label={t("table.cost")} value={formatUsd(stats.totals.costUsd)} tooltip={METRIC_HELP.cost} accent="#e34948" icon={<DollarSign className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label={t("me.streakLabel")}
          value={`${streak} ${t("me.streakUnitSuffix")}`}
          hint={t("me.streakHint")}
          accent="#eda100"
          icon={<Flame className="h-4 w-4" />}
        />
        <StatCard
          label={t("me.activeDaysLabel")}
          value={formatNumber(activeDays)}
          hint={t("me.activeDaysHint")}
          accent="#4a3aa7"
          icon={<CalendarDays className="h-4 w-4" />}
        />
        <StatCard
          label={t("me.tokensPerTurnLabel")}
          value={formatNumber(tokensPerTurn)}
          hint={t("me.tokensPerTurnHint")}
          tooltip={t("me.tokensPerTurnTooltip")}
          accent="#008300"
          icon={<Divide className="h-4 w-4" />}
        />
        <StatCard label={t("table.turns")} value={formatNumber(stats.totals.turnCount)} tooltip={METRIC_HELP.turns} accent="#2a78d6" icon={<RotateCw className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label={t("overview.linesAdded")} value={formatNumber(code.linesAdded)} tooltip={METRIC_HELP.linesAdded} accent="#008300" icon={<Plus className="h-4 w-4" />} />
        <StatCard label={t("overview.linesRemoved")} value={formatNumber(code.linesRemoved)} tooltip={METRIC_HELP.linesRemoved} accent="#e34948" icon={<Minus className="h-4 w-4" />} />
        <StatCard
          label={t("overview.acceptanceRate")}
          value={code.editsAccepted + code.editsRejected > 0 ? formatPercent(code.acceptanceRate) : "—"}
          hint={`${code.editsAccepted}/${code.editsAccepted + code.editsRejected} ${t("overview.acceptanceHintSuffix")}`}
          tooltip={METRIC_HELP.acceptanceRate}
          accent="#2a78d6"
          icon={<Check className="h-4 w-4" />}
        />
      </div>

      <Card title={t("overview.tokensByDay")}>
        <TrendChart
          data={stats.daily}
          series={[
            { key: "inputTokens", label: "Input", color: "#2a78d6" },
            { key: "outputTokens", label: "Output", color: "#eb6834" },
          ]}
        />
      </Card>

      {deptCmp && (
        <Card title={t("me.deptCompareTitle").replace("{count}", String(deptCmp.memberCount))}>
          <div className="flex flex-col gap-4">
            {comparisons.map((m) => {
              const max = Math.max(m.you, m.avg, 1);
              return (
                <div key={m.label}>
                  <div className="mb-1.5 text-sm font-medium">{m.label}</div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-16 shrink-0 text-[var(--text-muted)]">{t("me.youLabel")}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                      <div className="h-full rounded-full" style={{ width: `${(m.you / max) * 100}%`, background: "#2a78d6" }} />
                    </div>
                    <span className="w-24 shrink-0 text-right tabular-nums">{m.fmt(m.you)}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    <span className="w-16 shrink-0 text-[var(--text-muted)]">{t("me.deptAvgLabel")}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                      <div className="h-full rounded-full" style={{ width: `${(m.avg / max) * 100}%`, background: "#898781" }} />
                    </div>
                    <span className="w-24 shrink-0 text-right tabular-nums">{m.fmt(m.avg)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title={t("me.badgesTitle")}>
          <BadgeGrid badges={gami.badges} earnedCount={gami.earnedCount} totalCount={gami.totalCount} />
        </Card>

        <Card title={t("me.weekCompareTitle")}>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xs text-[var(--text-muted)]">{t("me.tokenLabel")}</div>
              <div className="text-lg font-semibold tabular-nums">{formatNumber(gami.recap.thisWeek.tokens)}</div>
              {recapDeltaTokens != null && (
                <div className={`inline-flex items-center gap-0.5 text-xs ${recapDeltaTokens >= 0 ? "text-[#0ca30c]" : "text-[#e34948]"}`}>
                  {recapDeltaTokens >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(recapDeltaTokens).toFixed(0)}%
                </div>
              )}
            </div>
            <div>
              <div className="inline-flex items-center justify-center gap-1 text-xs text-[var(--text-muted)]">
                {t("table.turns")}
                <InfoTip label={METRIC_HELP.turns} />
              </div>
              <div className="text-lg font-semibold tabular-nums">{gami.recap.thisWeek.turns}</div>
              <div className="text-xs text-[var(--text-muted)]">{t("me.beforeLabel")}: {gami.recap.lastWeek.turns}</div>
            </div>
            <div>
              <div className="text-xs text-[var(--text-muted)]">{t("me.activeDaysShortLabel")}</div>
              <div className="text-lg font-semibold tabular-nums">{gami.recap.thisWeek.days}</div>
              <div className="text-xs text-[var(--text-muted)]">{t("me.beforeLabel")}: {gami.recap.lastWeek.days}</div>
            </div>
          </div>
        </Card>
      </div>

      <Card title={t("me.topToolsTitle")}>
        {stats.topTools.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">{t("common.noData")}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {stats.topTools.map((t, i) => (
              <Tag key={t.toolName} color={colorForIndex(i)}>
                {t.toolName} · {t.count}
              </Tag>
            ))}
          </div>
        )}
      </Card>

      <Card
        title={t("me.taskCategoryTitle")}
        titleTip={t("me.taskCategoryTip")}
      >
        {taskCat.rows.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">{t("common.noData")}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {taskCat.rows.map((row, i) => {
              const pct = row.sessions / taskCat.totalSessions;
              return (
                <div key={row.category}>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span className="font-medium">{row.label}</span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {row.sessions} {t("me.taskCategorySessionsSuffix")} · {formatPercent(pct)} · {formatUsd(row.costUsd)}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                    <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, background: colorForIndex(i) }} />
                  </div>
                </div>
              );
            })}
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {t("me.taskCategoryFooter")
                .replace("{tagged}", String(taskCat.totalTaggedSessions))
                .replace("{total}", String(taskCat.totalSessions))}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
