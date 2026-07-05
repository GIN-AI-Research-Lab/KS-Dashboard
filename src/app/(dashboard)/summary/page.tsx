import Link from "next/link";
import { getOverviewStats, getCodeStats, getRankings } from "@/lib/stats";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { PrintButton } from "@/components/PrintButton";
import { METRIC_HELP } from "@/lib/glossary";
import { colorForModel } from "@/lib/chart-colors";
import { formatNumber, formatUsd, formatPercent } from "@/lib/format";
import { Sigma, DollarSign, MessagesSquare, Users, Plus, Check } from "lucide-react";

export const metadata = { title: "Tóm tắt tuần" };

export default async function WeeklySummaryPage() {
  const [stats, code, topUsers] = await Promise.all([
    getOverviewStats("7d"),
    getCodeStats("7d"),
    getRankings("totalTokens", "7d", 5),
  ]);

  const modelTotal = stats.byModel.reduce((s, m) => s + m.totalTokens, 0);

  return (
    <div className="stagger flex flex-col gap-6">
      <div className="hero-panel relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-[var(--border)] p-6 shadow-[var(--shadow-xs)]">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/60 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-secondary)]">
            <span className="gradient-brand h-1.5 w-1.5 rounded-full" />
            7 ngày qua
          </span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Tóm tắt <span className="gradient-text">tuần</span>
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Bản tóm tắt mức sử dụng Claude Code 7 ngày gần nhất — dùng để chia sẻ / in ra.
          </p>
        </div>
        <PrintButton />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Tổng token" tooltip={METRIC_HELP.totalTokens} value={formatNumber(stats.totals.totalTokens)} accent="#2a78d6" icon={<Sigma className="h-4 w-4" />} deltaPct={stats.deltas?.totalTokens} />
        <StatCard label="Chi phí" tooltip={METRIC_HELP.cost} value={formatUsd(stats.totals.costUsd)} accent="#e34948" icon={<DollarSign className="h-4 w-4" />} deltaPct={stats.deltas?.costUsd} />
        <StatCard label="Số phiên" value={formatNumber(stats.totals.sessionCount)} accent="#4a3aa7" icon={<MessagesSquare className="h-4 w-4" />} deltaPct={stats.deltas?.sessionCount} />
        <StatCard label="Người dùng hoạt động" tooltip={METRIC_HELP.activeUsers} value={formatNumber(stats.totals.activeUserCount)} accent="#1baf7a" icon={<Users className="h-4 w-4" />} />
        <StatCard label="Dòng code thêm" tooltip={METRIC_HELP.linesAdded} value={formatNumber(code.linesAdded)} accent="#008300" icon={<Plus className="h-4 w-4" />} />
        <StatCard
          label="Tỷ lệ chấp nhận sửa"
          tooltip={METRIC_HELP.acceptanceRate}
          value={code.editsAccepted + code.editsRejected > 0 ? formatPercent(code.acceptanceRate) : "—"}
          accent="#eda100"
          icon={<Check className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Top 5 · Dùng nhiều nhất">
          {topUsers.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">Chưa có dữ liệu</p>
          ) : (
            <ol className="flex flex-col gap-2.5">
              {topUsers.map((u, i) => (
                <li key={u.userId} className="flex items-center gap-3 text-sm">
                  <span className="w-4 shrink-0 text-xs font-semibold text-[var(--text-muted)]">{i + 1}</span>
                  <Link href={`/users/${u.userId}`} className="min-w-0 flex-1 truncate font-medium transition-colors hover:text-accent">
                    {u.userName}
                  </Link>
                  <span className="shrink-0 tabular-nums font-semibold">{formatNumber(u.value)}</span>
                  <span className="shrink-0 text-xs text-[var(--text-muted)]">token</span>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card title="Tỷ trọng theo model" titleTip={METRIC_HELP.model}>
          {stats.byModel.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">Chưa có dữ liệu</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {stats.byModel.map((m) => {
                const pct = modelTotal > 0 ? m.totalTokens / modelTotal : 0;
                return (
                  <li key={m.model} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorForModel(m.model) }} />
                      <span className="min-w-0 flex-1 truncate">{m.model}</span>
                      <span className="shrink-0 tabular-nums text-[var(--text-secondary)]">{formatPercent(pct)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--gridline)]">
                      <div className="h-full rounded-full" style={{ width: `${Math.max(2, pct * 100)}%`, background: colorForModel(m.model) }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
