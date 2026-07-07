import { Suspense } from "react";
import Link from "next/link";
import { auth } from "@/auth";
import {
  getOverviewStats,
  getRankings,
  getActivityHeatmap,
  getDepartmentScorecards,
  getLibraryFeed,
  getCodeStats,
  getTaskCategoryStats,
  type RangeKey,
} from "@/lib/stats";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { RangeSelector } from "@/components/RangeSelector";
import { TrendChart, ModelDonut, RankBarChart } from "@/components/charts/lazy";
import { ActivityHeatmap } from "@/components/charts/ActivityHeatmap";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { InfoTip } from "@/components/ui/InfoTip";
import { getMetricHelp } from "@/lib/glossary";
import { KIND_LABEL, KIND_VARIANT } from "@/lib/library";
import { formatNumber, formatUsd, formatPercent, formatRelativeTime } from "@/lib/format";
import { getT } from "@/i18n/server";
import type { Translate } from "@/i18n/lookup";
import {
  Sigma,
  ArrowDownToLine,
  ArrowUpFromLine,
  DollarSign,
  MessagesSquare,
  Activity,
  Zap,
  Download,
  Upload,
  Plus,
  Minus,
  Check,
  MessageSquare,
  Inbox,
} from "lucide-react";

// ── skeleton fallbacks (shown per-section while its query streams in) ──
function GridSkeleton({ n, cols, h }: { n: number; cols: string; h: string }) {
  return (
    <div className={`grid gap-4 ${cols}`}>
      {Array.from({ length: n }).map((_, i) => (
        <Skeleton key={i} className={`${h} rounded-2xl`} />
      ))}
    </div>
  );
}

function StatsFallback() {
  return (
    <div className="flex flex-col gap-6">
      <GridSkeleton n={6} cols="grid-cols-2 md:grid-cols-3 xl:grid-cols-6" h="h-24" />
      <GridSkeleton n={3} cols="grid-cols-1 sm:grid-cols-3" h="h-24" />
      <div className="grid gap-4 xl:grid-cols-3">
        <Skeleton className="h-[320px] rounded-2xl xl:col-span-2" />
        <Skeleton className="h-[320px] rounded-2xl" />
      </div>
    </div>
  );
}

// ── data sections (each fetches its own data → streams independently) ──
async function StatsSection({ r, t }: { r: RangeKey; t: Translate }) {
  const stats = await getOverviewStats(r);
  const METRIC_HELP = getMetricHelp(t);
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label={t("overview.totalTokens")} tooltip={METRIC_HELP.totalTokens} value={formatNumber(stats.totals.totalTokens)} rawValue={stats.totals.totalTokens} format="number" spark={stats.daily.map((d) => d.inputTokens + d.outputTokens)} accent="#2a78d6" icon={<Sigma className="h-4 w-4" />} deltaPct={stats.deltas?.totalTokens} />
        <StatCard label={t("overview.inputTokens")} tooltip={METRIC_HELP.inputTokens} value={formatNumber(stats.totals.inputTokens)} rawValue={stats.totals.inputTokens} format="number" spark={stats.daily.map((d) => d.inputTokens)} accent="#1baf7a" icon={<ArrowDownToLine className="h-4 w-4" />} />
        <StatCard label={t("overview.outputTokens")} tooltip={METRIC_HELP.outputTokens} value={formatNumber(stats.totals.outputTokens)} rawValue={stats.totals.outputTokens} format="number" spark={stats.daily.map((d) => d.outputTokens)} accent="#eb6834" icon={<ArrowUpFromLine className="h-4 w-4" />} />
        <StatCard label={t("overview.estimatedCost")} tooltip={METRIC_HELP.cost} value={formatUsd(stats.totals.costUsd)} rawValue={stats.totals.costUsd} format="usd" spark={stats.daily.map((d) => d.costUsd)} accent="#e34948" icon={<DollarSign className="h-4 w-4" />} deltaPct={stats.deltas?.costUsd} />
        <StatCard label={t("overview.sessionCount")} value={formatNumber(stats.totals.sessionCount)} rawValue={stats.totals.sessionCount} format="number" accent="#4a3aa7" icon={<MessagesSquare className="h-4 w-4" />} deltaPct={stats.deltas?.sessionCount} />
        <StatCard label={t("overview.activeNow")} tooltip={METRIC_HELP.activeSessions} value={formatNumber(stats.totals.activeSessionCount)} rawValue={stats.totals.activeSessionCount} format="number" accent="#0ca30c" icon={<Activity className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t("overview.cacheHitRatio")} tooltip={METRIC_HELP.cacheHitRatio} value={formatPercent(stats.totals.cacheHitRatio)} hint={t("overview.cacheHitHint")} accent="#008300" icon={<Zap className="h-4 w-4" />} />
        <StatCard label={t("overview.cacheReadTokens")} tooltip={METRIC_HELP.cacheReadTokens} value={formatNumber(stats.totals.cacheReadTokens)} hint={t("overview.cacheReadHint")} accent="#1baf7a" icon={<Download className="h-4 w-4" />} />
        <StatCard label={t("overview.cacheCreateTokens")} tooltip={METRIC_HELP.cacheCreationTokens} value={formatNumber(stats.totals.cacheCreationTokens)} hint={t("overview.cacheCreateHint")} accent="#eda100" icon={<Upload className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card title={t("overview.tokensByDay")} className="xl:col-span-2">
          <TrendChart
            data={stats.daily}
            series={[
              { key: "inputTokens", label: "Input", color: "#2a78d6" },
              { key: "outputTokens", label: "Output", color: "#eb6834" },
            ]}
          />
        </Card>
        <Card title={t("overview.byModel")}>
          <ModelDonut data={stats.byModel} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card title={t("overview.costByDay")} className="xl:col-span-2">
          <TrendChart data={stats.daily} series={[{ key: "costUsd", label: t("overview.cost"), color: "#e34948" }]} valueFormat="usd" />
        </Card>
        <Card title={`${stats.totals.activeUserCount} ${t("overview.activeUsersSuffix")}`} titleTip={METRIC_HELP.activeUsers}>
          <div className="flex h-full flex-col justify-center gap-4 py-4 text-center">
            <div>
              <div className="text-4xl font-semibold tabular-nums">{stats.totals.userCount}</div>
              <div className="text-xs text-[var(--text-muted)]">{t("overview.totalAccounts")}</div>
            </div>
            <div className="h-px bg-[var(--gridline)]" />
            <div>
              <div className="text-2xl font-semibold tabular-nums">{formatNumber(stats.totals.turnCount)}</div>
              <div className="text-xs text-[var(--text-muted)]">{t("overview.turnCountLabel")}</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

async function CodeSection({ r, t }: { r: RangeKey; t: Translate }) {
  const code = await getCodeStats(r);
  const METRIC_HELP = getMetricHelp(t);
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard label={t("overview.linesAdded")} tooltip={METRIC_HELP.linesAdded} value={formatNumber(code.linesAdded)} hint={t("overview.fromOtel")} accent="#008300" icon={<Plus className="h-4 w-4" />} />
      <StatCard label={t("overview.linesRemoved")} tooltip={METRIC_HELP.linesRemoved} value={formatNumber(code.linesRemoved)} accent="#e34948" icon={<Minus className="h-4 w-4" />} />
      <StatCard
        label={t("overview.acceptanceRate")}
        tooltip={METRIC_HELP.acceptanceRate}
        value={code.editsAccepted + code.editsRejected > 0 ? formatPercent(code.acceptanceRate) : "—"}
        hint={`${code.editsAccepted}/${code.editsAccepted + code.editsRejected} ${t("overview.acceptanceHintSuffix")}`}
        accent="#2a78d6"
        icon={<Check className="h-4 w-4" />}
      />
    </div>
  );
}

async function TaskCategorySection({ r, t }: { r: RangeKey; t: Translate }) {
  const taskCat = await getTaskCategoryStats(r);
  if (taskCat.rows.length === 0) return null;
  return (
    <Card title={t("overview.taskCategoryTitle")} titleTip={t("overview.taskCategoryTip")}>
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
      <p className="mt-3 text-xs text-[var(--text-muted)]">
        {t("overview.taskCategoryFooter")
          .replace("{tagged}", String(taskCat.totalTaggedSessions))
          .replace("{total}", String(taskCat.totalSessions))}
      </p>
    </Card>
  );
}

async function LibrarySection({ viewerId, t }: { viewerId: string; t: Translate }) {
  const [libNew, libReactions, libComments] = await Promise.all([
    getLibraryFeed({ sort: "new", viewerId, limit: 5 }),
    getLibraryFeed({ sort: "reactions", viewerId, limit: 5 }),
    getLibraryFeed({ sort: "comments", viewerId, limit: 5 }),
  ]);
  const libSections = [
    { title: t("overview.newest"), items: libNew, metric: (it: (typeof libNew)[number]) => formatRelativeTime(it.createdAt) },
    {
      title: t("overview.mostReacted"),
      items: libReactions,
      metric: (it: (typeof libReactions)[number]) => (
        <span className="inline-flex items-center gap-1 tabular-nums">
          <Zap className="h-3 w-3" /> {it.counts.reactions}
        </span>
      ),
    },
    {
      title: t("overview.mostCommented"),
      items: libComments,
      metric: (it: (typeof libComments)[number]) => (
        <span className="inline-flex items-center gap-1 tabular-nums">
          <MessageSquare className="h-3 w-3" /> {it.counts.comments}
        </span>
      ),
    },
  ];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">{t("overview.libraryHeading")}</h2>
        <Link href="/library" className="text-xs font-medium text-[var(--accent)] transition-colors hover:text-[var(--accent-hover)]">
          {t("overview.viewAll")} →
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {libSections.map((sec) => (
          <Card key={sec.title} title={sec.title}>
            {sec.items.length === 0 ? (
              <EmptyState icon={<Inbox className="h-5 w-5" />} title={t("overview.noPosts")} hint={t("overview.contentWillShow")} className="!px-2 !py-6" />
            ) : (
              <ol className="flex flex-col gap-2.5">
                {sec.items.map((it, i) => (
                  <li key={it.id} className="flex items-center gap-2 text-sm">
                    <span className="w-4 shrink-0 text-xs font-semibold text-[var(--text-muted)]">{i + 1}</span>
                    <Badge variant={KIND_VARIANT[it.kind]}>{KIND_LABEL[it.kind]}</Badge>
                    <Link href={`/library/${it.id}`} className="min-w-0 flex-1 truncate hover:underline">
                      {it.title}
                    </Link>
                    <span className="shrink-0 text-xs text-[var(--text-muted)]">{sec.metric(it)}</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

async function HeatmapSection({ r, t }: { r: RangeKey; t: Translate }) {
  const heatmap = await getActivityHeatmap(r);
  const METRIC_HELP = getMetricHelp(t);
  return (
    <Card title={t("overview.activityByHour")} titleTip={METRIC_HELP.turns}>
      <ActivityHeatmap grid={heatmap.grid} max={heatmap.max} mode={heatmap.mode} />
    </Card>
  );
}

async function DepartmentScoreSection({ r, t }: { r: RangeKey; t: Translate }) {
  const deptScore = await getDepartmentScorecards(r);
  if (deptScore.rows.length === 0) return null;
  const METRIC_HELP = getMetricHelp(t);
  return (
    <Card
      title={t("overview.deptScoreTitle")}
      action={<span className="text-xs text-[var(--text-muted)]">{t("overview.median")}: {formatNumber(deptScore.medianTokensPerMember)} {t("overview.tokensPerPerson")}</span>}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
              <th className="py-2 pr-4 font-medium">{t("overview.colDepartment")}</th>
              <th className="py-2 pr-4 text-right font-medium">{t("overview.colMembers")}</th>
              <th className="py-2 pr-4 text-right font-medium">
                <span className="inline-flex items-center gap-1">{t("overview.colCoverage")}<InfoTip label={METRIC_HELP.coverage} /></span>
              </th>
              <th className="py-2 pr-4 text-right font-medium">
                <span className="inline-flex items-center gap-1">{t("overview.colTokensPerPerson")}<InfoTip label={METRIC_HELP.tokensPerMember} /></span>
              </th>
              <th className="py-2 pr-4 text-right font-medium">
                <span className="inline-flex items-center gap-1">{t("overview.colCostPerUser")}<InfoTip label={METRIC_HELP.costPerUser} /></span>
              </th>
              <th className="py-2 text-right font-medium">{t("overview.colTotalCost")}</th>
            </tr>
          </thead>
          <tbody>
            {deptScore.rows.map((d) => {
              const above = d.tokensPerMember >= deptScore.medianTokensPerMember;
              return (
                <tr key={d.departmentId} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-2 pr-4 font-medium">{d.name}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{d.members}</td>
                  <td className="py-2 pr-4 text-right tabular-nums text-[var(--text-secondary)]">
                    {d.activeUsers}/{d.members} · {formatPercent(d.coverage)}
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums">
                    <span className={above ? "text-[#0ca30c]" : "text-[var(--text-secondary)]"}>
                      {above ? "▲" : "▼"} {formatNumber(d.tokensPerMember)}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums text-[var(--text-secondary)]">{formatUsd(d.costPerActiveUser)}</td>
                  <td className="py-2 text-right tabular-nums">{formatUsd(d.costUsd)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

async function RankingsSection({ r, t }: { r: RangeKey; t: Translate }) {
  const [topTokenUsers, topCostUsers] = await Promise.all([
    getRankings("totalTokens", r, 6),
    getRankings("costUsd", r, 6),
  ]);
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card title={t("overview.top6Tokens")}>
        <RankBarChart data={topTokenUsers.map((u) => ({ label: u.userName, value: u.value }))} valueFormat="number" />
      </Card>
      <Card title={t("overview.top6Cost")}>
        <RankBarChart data={topCostUsers.map((u) => ({ label: u.userName, value: u.value }))} valueFormat="usd" />
      </Card>
    </div>
  );
}

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const r = (range ?? "30d") as RangeKey;
  const [session, t] = await Promise.all([auth(), getT()]);
  const viewerId = session!.user.id;

  return (
    <div className="stagger flex flex-col gap-6">
      <div className="hero-panel relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-[var(--border)] p-6 shadow-[var(--shadow-xs)]">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/60 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-secondary)]">
            <span className="gradient-brand h-1.5 w-1.5 rounded-full" />
            {t("overview.badge")}
          </span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            <span className="gradient-text">{t("overview.title")}</span>
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{t("overview.subtitle")}</p>
        </div>
        <RangeSelector defaultRange={r} />
      </div>

      <Suspense fallback={<StatsFallback />}>
        <StatsSection r={r} t={t} />
      </Suspense>

      <Suspense fallback={<GridSkeleton n={3} cols="grid-cols-1 sm:grid-cols-3" h="h-24" />}>
        <CodeSection r={r} t={t} />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-[220px] rounded-2xl" />}>
        <TaskCategorySection r={r} t={t} />
      </Suspense>

      <Suspense fallback={<GridSkeleton n={3} cols="grid-cols-1 md:grid-cols-3" h="h-40" />}>
        <LibrarySection viewerId={viewerId} t={t} />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-[220px] rounded-2xl" />}>
        <HeatmapSection r={r} t={t} />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-[240px] rounded-2xl" />}>
        <DepartmentScoreSection r={r} t={t} />
      </Suspense>

      <Suspense fallback={<GridSkeleton n={2} cols="grid-cols-1 lg:grid-cols-2" h="h-[240px]" />}>
        <RankingsSection r={r} t={t} />
      </Suspense>
    </div>
  );
}
