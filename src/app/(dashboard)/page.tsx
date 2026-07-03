import { getOverviewStats, getRankings, getActivityHeatmap, type RangeKey } from "@/lib/stats";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { RangeSelector } from "@/components/RangeSelector";
import { TrendChart } from "@/components/charts/TrendChart";
import { ModelDonut } from "@/components/charts/ModelDonut";
import { RankBarChart } from "@/components/charts/RankBarChart";
import { ActivityHeatmap } from "@/components/charts/ActivityHeatmap";
import { formatNumber, formatUsd, formatPercent } from "@/lib/format";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const r = (range ?? "30d") as RangeKey;

  const [stats, topTokenUsers, topCostUsers, heatmap] = await Promise.all([
    getOverviewStats(r),
    getRankings("totalTokens", r, 6),
    getRankings("costUsd", r, 6),
    getActivityHeatmap(r),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Tổng quan công ty</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Tổng hợp mức sử dụng Claude Code của toàn bộ nhân viên
          </p>
        </div>
        <RangeSelector defaultRange={r} />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Tổng token" value={formatNumber(stats.totals.totalTokens)} accent="#2a78d6" icon="Σ" deltaPct={stats.deltas?.totalTokens} />
        <StatCard label="Input token" value={formatNumber(stats.totals.inputTokens)} accent="#1baf7a" icon="→" />
        <StatCard label="Output token" value={formatNumber(stats.totals.outputTokens)} accent="#eb6834" icon="←" />
        <StatCard label="Chi phí ước tính" value={formatUsd(stats.totals.costUsd)} accent="#e34948" icon="$" deltaPct={stats.deltas?.costUsd} />
        <StatCard label="Số phiên" value={formatNumber(stats.totals.sessionCount)} accent="#4a3aa7" icon="◧" deltaPct={stats.deltas?.sessionCount} />
        <StatCard label="Đang hoạt động" value={formatNumber(stats.totals.activeSessionCount)} accent="#0ca30c" icon="●" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Cache hit ratio"
          value={formatPercent(stats.totals.cacheHitRatio)}
          hint="Phần input được phục vụ từ cache"
          accent="#008300"
          icon="⚡"
        />
        <StatCard
          label="Token đọc từ cache"
          value={formatNumber(stats.totals.cacheReadTokens)}
          hint="Không tính phí như input mới"
          accent="#1baf7a"
          icon="⇐"
        />
        <StatCard
          label="Token tạo cache"
          value={formatNumber(stats.totals.cacheCreationTokens)}
          hint="Chi phí ghi cache ban đầu"
          accent="#eda100"
          icon="⇒"
        />
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
          <TrendChart
            data={stats.daily}
            series={[{ key: "costUsd", label: "Chi phí", color: "#e34948" }]}
            valueFormat="usd"
          />
        </Card>
        <Card title={`${stats.totals.activeUserCount} người dùng hoạt động`}>
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

      <Card title="Nhịp độ hoạt động theo giờ (turns)">
        <ActivityHeatmap grid={heatmap.grid} max={heatmap.max} />
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Top 6 · Tổng token">
          <RankBarChart
            data={topTokenUsers.map((u) => ({ label: u.userName, value: u.value }))}
            valueFormat="number"
          />
        </Card>
        <Card title="Top 6 · Chi phí">
          <RankBarChart
            data={topCostUsers.map((u) => ({ label: u.userName, value: u.value }))}
            valueFormat="usd"
          />
        </Card>
      </div>
    </div>
  );
}
