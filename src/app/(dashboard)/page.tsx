import { Suspense } from "react";
import Link from "next/link";
import { auth } from "@/auth";
import {
  getOverviewStats,
  getRankings,
  getActivityHeatmap,
  getTeamScorecards,
  getLibraryFeed,
  getCodeStats,
  type RangeKey,
} from "@/lib/stats";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { RangeSelector } from "@/components/RangeSelector";
import { BudgetAlert } from "@/components/BudgetAlert";
import { TrendChart, ModelDonut, RankBarChart } from "@/components/charts/lazy";
import { ActivityHeatmap } from "@/components/charts/ActivityHeatmap";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { InfoTip } from "@/components/ui/InfoTip";
import { METRIC_HELP } from "@/lib/glossary";
import { KIND_LABEL, KIND_VARIANT } from "@/lib/library";
import { formatNumber, formatUsd, formatPercent, formatRelativeTime } from "@/lib/format";
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
async function StatsSection({ r }: { r: RangeKey }) {
  const stats = await getOverviewStats(r);
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Tổng token" tooltip={METRIC_HELP.totalTokens} value={formatNumber(stats.totals.totalTokens)} rawValue={stats.totals.totalTokens} format="number" spark={stats.daily.map((d) => d.inputTokens + d.outputTokens)} accent="#2a78d6" icon={<Sigma className="h-4 w-4" />} deltaPct={stats.deltas?.totalTokens} />
        <StatCard label="Input token" tooltip={METRIC_HELP.inputTokens} value={formatNumber(stats.totals.inputTokens)} rawValue={stats.totals.inputTokens} format="number" spark={stats.daily.map((d) => d.inputTokens)} accent="#1baf7a" icon={<ArrowDownToLine className="h-4 w-4" />} />
        <StatCard label="Output token" tooltip={METRIC_HELP.outputTokens} value={formatNumber(stats.totals.outputTokens)} rawValue={stats.totals.outputTokens} format="number" spark={stats.daily.map((d) => d.outputTokens)} accent="#eb6834" icon={<ArrowUpFromLine className="h-4 w-4" />} />
        <StatCard label="Chi phí ước tính" tooltip={METRIC_HELP.cost} value={formatUsd(stats.totals.costUsd)} rawValue={stats.totals.costUsd} format="usd" spark={stats.daily.map((d) => d.costUsd)} accent="#e34948" icon={<DollarSign className="h-4 w-4" />} deltaPct={stats.deltas?.costUsd} />
        <StatCard label="Số phiên" value={formatNumber(stats.totals.sessionCount)} rawValue={stats.totals.sessionCount} format="number" accent="#4a3aa7" icon={<MessagesSquare className="h-4 w-4" />} deltaPct={stats.deltas?.sessionCount} />
        <StatCard label="Đang hoạt động" tooltip={METRIC_HELP.activeSessions} value={formatNumber(stats.totals.activeSessionCount)} rawValue={stats.totals.activeSessionCount} format="number" accent="#0ca30c" icon={<Activity className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Cache hit ratio" tooltip={METRIC_HELP.cacheHitRatio} value={formatPercent(stats.totals.cacheHitRatio)} hint="Phần input được phục vụ từ cache" accent="#008300" icon={<Zap className="h-4 w-4" />} />
        <StatCard label="Token đọc từ cache" tooltip={METRIC_HELP.cacheReadTokens} value={formatNumber(stats.totals.cacheReadTokens)} hint="Không tính phí như input mới" accent="#1baf7a" icon={<Download className="h-4 w-4" />} />
        <StatCard label="Token tạo cache" tooltip={METRIC_HELP.cacheCreationTokens} value={formatNumber(stats.totals.cacheCreationTokens)} hint="Chi phí ghi cache ban đầu" accent="#eda100" icon={<Upload className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card title="Token theo ngày" className="xl:col-span-2">
          <TrendChart
            data={stats.daily}
            series={[
              { key: "inputTokens", label: "Input", color: "#2a78d6" },
              { key: "outputTokens", label: "Output", color: "#eb6834" },
            ]}
          />
        </Card>
        <Card title="Tỷ trọng theo model">
          <ModelDonut data={stats.byModel} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card title="Chi phí theo ngày (USD)" className="xl:col-span-2">
          <TrendChart data={stats.daily} series={[{ key: "costUsd", label: "Chi phí", color: "#e34948" }]} valueFormat="usd" />
        </Card>
        <Card title={`${stats.totals.activeUserCount} người dùng hoạt động`} titleTip={METRIC_HELP.activeUsers}>
          <div className="flex h-full flex-col justify-center gap-4 py-4 text-center">
            <div>
              <div className="text-4xl font-semibold tabular-nums">{stats.totals.userCount}</div>
              <div className="text-xs text-[var(--text-muted)]">tổng số tài khoản</div>
            </div>
            <div className="h-px bg-[var(--gridline)]" />
            <div>
              <div className="text-2xl font-semibold tabular-nums">{formatNumber(stats.totals.turnCount)}</div>
              <div className="text-xs text-[var(--text-muted)]">lượt phản hồi (turns)</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

async function CodeSection({ r }: { r: RangeKey }) {
  const code = await getCodeStats(r);
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard label="Dòng code thêm" tooltip={METRIC_HELP.linesAdded} value={formatNumber(code.linesAdded)} hint="Từ Claude Code (OTel)" accent="#008300" icon={<Plus className="h-4 w-4" />} />
      <StatCard label="Dòng code xoá" tooltip={METRIC_HELP.linesRemoved} value={formatNumber(code.linesRemoved)} accent="#e34948" icon={<Minus className="h-4 w-4" />} />
      <StatCard
        label="Tỷ lệ chấp nhận sửa"
        tooltip={METRIC_HELP.acceptanceRate}
        value={code.editsAccepted + code.editsRejected > 0 ? formatPercent(code.acceptanceRate) : "—"}
        hint={`${code.editsAccepted}/${code.editsAccepted + code.editsRejected} gợi ý sửa`}
        accent="#2a78d6"
        icon={<Check className="h-4 w-4" />}
      />
    </div>
  );
}

async function LibrarySection({ viewerId }: { viewerId: string }) {
  const [libNew, libReactions, libComments] = await Promise.all([
    getLibraryFeed({ sort: "new", viewerId, limit: 5 }),
    getLibraryFeed({ sort: "reactions", viewerId, limit: 5 }),
    getLibraryFeed({ sort: "comments", viewerId, limit: 5 }),
  ]);
  const libSections = [
    { title: "Mới nhất", items: libNew, metric: (it: (typeof libNew)[number]) => formatRelativeTime(it.createdAt) },
    {
      title: "Nhiều react nhất",
      items: libReactions,
      metric: (it: (typeof libReactions)[number]) => (
        <span className="inline-flex items-center gap-1 tabular-nums">
          <Zap className="h-3 w-3" /> {it.counts.reactions}
        </span>
      ),
    },
    {
      title: "Nhiều comment nhất",
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
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">Thư viện · Prompt &amp; Skill</h2>
        <Link href="/library" className="text-xs font-medium text-[var(--accent)] transition-colors hover:text-[var(--accent-hover)]">
          Xem tất cả →
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {libSections.map((sec) => (
          <Card key={sec.title} title={sec.title}>
            {sec.items.length === 0 ? (
              <EmptyState icon={<Inbox className="h-5 w-5" />} title="Chưa có bài" hint="Nội dung sẽ hiện ở đây" className="!px-2 !py-6" />
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

async function HeatmapSection({ r }: { r: RangeKey }) {
  const heatmap = await getActivityHeatmap(r);
  return (
    <Card title="Nhịp độ hoạt động theo giờ (turns)" titleTip={METRIC_HELP.turns}>
      <ActivityHeatmap grid={heatmap.grid} max={heatmap.max} />
    </Card>
  );
}

async function TeamScoreSection({ r }: { r: RangeKey }) {
  const teamScore = await getTeamScorecards(r);
  if (teamScore.rows.length === 0) return null;
  return (
    <Card
      title="Bảng điểm theo nhóm"
      action={<span className="text-xs text-[var(--text-muted)]">Trung vị: {formatNumber(teamScore.medianTokensPerMember)} token/người</span>}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
              <th className="py-2 pr-4 font-medium">Nhóm</th>
              <th className="py-2 pr-4 text-right font-medium">Thành viên</th>
              <th className="py-2 pr-4 text-right font-medium">
                <span className="inline-flex items-center gap-1">Độ phủ<InfoTip label={METRIC_HELP.coverage} /></span>
              </th>
              <th className="py-2 pr-4 text-right font-medium">
                <span className="inline-flex items-center gap-1">Token/người<InfoTip label={METRIC_HELP.tokensPerMember} /></span>
              </th>
              <th className="py-2 pr-4 text-right font-medium">
                <span className="inline-flex items-center gap-1">Chi phí/người dùng<InfoTip label={METRIC_HELP.costPerUser} /></span>
              </th>
              <th className="py-2 text-right font-medium">Tổng chi phí</th>
            </tr>
          </thead>
          <tbody>
            {teamScore.rows.map((t) => {
              const above = t.tokensPerMember >= teamScore.medianTokensPerMember;
              return (
                <tr key={t.teamId} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-2 pr-4 font-medium">{t.name}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{t.members}</td>
                  <td className="py-2 pr-4 text-right tabular-nums text-[var(--text-secondary)]">
                    {t.activeUsers}/{t.members} · {formatPercent(t.coverage)}
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums">
                    <span className={above ? "text-[#0ca30c]" : "text-[var(--text-secondary)]"}>
                      {above ? "▲" : "▼"} {formatNumber(t.tokensPerMember)}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums text-[var(--text-secondary)]">{formatUsd(t.costPerActiveUser)}</td>
                  <td className="py-2 text-right tabular-nums">{formatUsd(t.costUsd)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

async function RankingsSection({ r }: { r: RangeKey }) {
  const [topTokenUsers, topCostUsers] = await Promise.all([
    getRankings("totalTokens", r, 6),
    getRankings("costUsd", r, 6),
  ]);
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card title="Top 6 · Tổng token">
        <RankBarChart data={topTokenUsers.map((u) => ({ label: u.userName, value: u.value }))} valueFormat="number" />
      </Card>
      <Card title="Top 6 · Chi phí">
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
  const session = await auth();
  const viewerId = session!.user.id;

  return (
    <div className="stagger flex flex-col gap-6">
      <div className="hero-panel relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-[var(--border)] p-6 shadow-[var(--shadow-xs)]">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/60 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-secondary)]">
            <span className="gradient-brand h-1.5 w-1.5 rounded-full" />
            Tổng quan
          </span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Tổng quan <span className="gradient-text">công ty</span>
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Tổng hợp mức sử dụng Claude Code của toàn bộ nhân viên</p>
        </div>
        <RangeSelector defaultRange={r} />
      </div>

      <Suspense fallback={<Skeleton className="h-[72px] rounded-2xl" />}>
        <BudgetAlert />
      </Suspense>

      <Suspense fallback={<StatsFallback />}>
        <StatsSection r={r} />
      </Suspense>

      <Suspense fallback={<GridSkeleton n={3} cols="grid-cols-1 sm:grid-cols-3" h="h-24" />}>
        <CodeSection r={r} />
      </Suspense>

      <Suspense fallback={<GridSkeleton n={3} cols="grid-cols-1 md:grid-cols-3" h="h-40" />}>
        <LibrarySection viewerId={viewerId} />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-[220px] rounded-2xl" />}>
        <HeatmapSection r={r} />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-[240px] rounded-2xl" />}>
        <TeamScoreSection r={r} />
      </Suspense>

      <Suspense fallback={<GridSkeleton n={2} cols="grid-cols-1 lg:grid-cols-2" h="h-[240px]" />}>
        <RankingsSection r={r} />
      </Suspense>
    </div>
  );
}
