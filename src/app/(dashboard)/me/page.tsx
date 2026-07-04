import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getUserStats, getUserGamification, getTeamAverages, getUserCodeStats, type RangeKey } from "@/lib/stats";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { RangeSelector } from "@/components/RangeSelector";
import { TrendChart } from "@/components/charts/TrendChart";
import { Tag } from "@/components/ui/Badge";
import { BadgeGrid } from "@/components/BadgeGrid";
import { formatNumber, formatUsd, formatPercent } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/access";
import { colorForIndex } from "@/lib/chart-colors";
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
  const session = await auth();

  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    include: { team: true, department: true },
  });
  if (!user) return null;

  const [stats, gami, teamCmp, code] = await Promise.all([
    getUserStats(user.id, r),
    getUserGamification(user.id),
    user.teamId ? getTeamAverages(user.teamId, r) : Promise.resolve(null),
    getUserCodeStats(user.id, r),
  ]);
  const streak = gami.streak;

  const recapDeltaTokens =
    gami.recap.lastWeek.tokens > 0
      ? ((gami.recap.thisWeek.tokens - gami.recap.lastWeek.tokens) / gami.recap.lastWeek.tokens) * 100
      : null;

  const activeDays = stats.daily.length;
  const tokensPerTurn = stats.totals.turnCount > 0 ? stats.totals.totalTokens / stats.totals.turnCount : 0;

  const comparisons = teamCmp
    ? ([
        { label: "Tổng token", you: stats.totals.totalTokens, avg: teamCmp.avg.totalTokens, fmt: formatNumber },
        { label: "Chi phí", you: stats.totals.costUsd, avg: teamCmp.avg.costUsd, fmt: formatUsd },
        { label: "Turns", you: stats.totals.turnCount, avg: teamCmp.avg.turnCount, fmt: formatNumber },
      ] as const)
    : [];

  return (
    <div className="stagger flex flex-col gap-6">
      <div className="hero-panel relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-[var(--border)] p-6 shadow-[var(--shadow-xs)]">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/60 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-secondary)] backdrop-blur">
            <span className="gradient-brand h-1.5 w-1.5 rounded-full" />
            TRANG CÁ NHÂN
          </span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            <span className="gradient-text">{user.name}</span>
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {ROLE_LABELS[user.role]}
            {user.department ? ` · ${user.department.name}` : ""}
            {user.team ? ` · ${user.team.name}` : ""}
          </p>
        </div>
        <RangeSelector defaultRange={r} />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Tổng token" value={formatNumber(stats.totals.totalTokens)} accent="#2a78d6" icon={<Sigma className="h-4 w-4" />} />
        <StatCard label="Input" value={formatNumber(stats.totals.inputTokens)} accent="#1baf7a" icon={<ArrowRight className="h-4 w-4" />} />
        <StatCard label="Output" value={formatNumber(stats.totals.outputTokens)} accent="#eb6834" icon={<ArrowLeft className="h-4 w-4" />} />
        <StatCard label="Chi phí" value={formatUsd(stats.totals.costUsd)} accent="#e34948" icon={<DollarSign className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Chuỗi ngày hoạt động"
          value={`${streak} ngày`}
          hint="Số ngày làm việc liên tục"
          accent="#eda100"
          icon={<Flame className="h-4 w-4" />}
        />
        <StatCard
          label="Số ngày hoạt động"
          value={formatNumber(activeDays)}
          hint="Trong khoảng đang chọn"
          accent="#4a3aa7"
          icon={<CalendarDays className="h-4 w-4" />}
        />
        <StatCard
          label="Token / turn"
          value={formatNumber(tokensPerTurn)}
          hint="Trung bình mỗi lượt"
          accent="#008300"
          icon={<Divide className="h-4 w-4" />}
        />
        <StatCard label="Số turns" value={formatNumber(stats.totals.turnCount)} accent="#2a78d6" icon={<RotateCw className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label="Dòng code thêm" value={formatNumber(code.linesAdded)} accent="#008300" icon={<Plus className="h-4 w-4" />} />
        <StatCard label="Dòng code xoá" value={formatNumber(code.linesRemoved)} accent="#e34948" icon={<Minus className="h-4 w-4" />} />
        <StatCard
          label="Tỷ lệ chấp nhận sửa"
          value={code.editsAccepted + code.editsRejected > 0 ? formatPercent(code.acceptanceRate) : "—"}
          hint={`${code.editsAccepted}/${code.editsAccepted + code.editsRejected} gợi ý`}
          accent="#2a78d6"
          icon={<Check className="h-4 w-4" />}
        />
      </div>

      <Card title="Token theo ngày">
        <TrendChart
          data={stats.daily}
          series={[
            { key: "inputTokens", label: "Input", color: "#2a78d6" },
            { key: "outputTokens", label: "Output", color: "#eb6834" },
          ]}
        />
      </Card>

      {teamCmp && (
        <Card title={`So với trung bình nhóm (${teamCmp.memberCount} người)`}>
          <div className="flex flex-col gap-4">
            {comparisons.map((m) => {
              const max = Math.max(m.you, m.avg, 1);
              return (
                <div key={m.label}>
                  <div className="mb-1.5 text-sm font-medium">{m.label}</div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-16 shrink-0 text-[var(--text-muted)]">Bạn</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                      <div className="h-full rounded-full" style={{ width: `${(m.you / max) * 100}%`, background: "#2a78d6" }} />
                    </div>
                    <span className="w-24 shrink-0 text-right tabular-nums">{m.fmt(m.you)}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    <span className="w-16 shrink-0 text-[var(--text-muted)]">TB nhóm</span>
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
        <Card title="Huy hiệu">
          <BadgeGrid badges={gami.badges} earnedCount={gami.earnedCount} totalCount={gami.totalCount} />
        </Card>

        <Card title="Tuần này vs tuần trước">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xs text-[var(--text-muted)]">Token</div>
              <div className="text-lg font-semibold tabular-nums">{formatNumber(gami.recap.thisWeek.tokens)}</div>
              {recapDeltaTokens != null && (
                <div className={`inline-flex items-center gap-0.5 text-xs ${recapDeltaTokens >= 0 ? "text-[#0ca30c]" : "text-[#e34948]"}`}>
                  {recapDeltaTokens >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(recapDeltaTokens).toFixed(0)}%
                </div>
              )}
            </div>
            <div>
              <div className="text-xs text-[var(--text-muted)]">Turns</div>
              <div className="text-lg font-semibold tabular-nums">{gami.recap.thisWeek.turns}</div>
              <div className="text-xs text-[var(--text-muted)]">trước: {gami.recap.lastWeek.turns}</div>
            </div>
            <div>
              <div className="text-xs text-[var(--text-muted)]">Ngày hoạt động</div>
              <div className="text-lg font-semibold tabular-nums">{gami.recap.thisWeek.days}</div>
              <div className="text-xs text-[var(--text-muted)]">trước: {gami.recap.lastWeek.days}</div>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Công cụ dùng nhiều nhất">
        {stats.topTools.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">Chưa có dữ liệu</p>
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
    </div>
  );
}
