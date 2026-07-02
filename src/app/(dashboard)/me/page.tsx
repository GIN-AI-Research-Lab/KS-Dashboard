import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getUserStats, type RangeKey } from "@/lib/stats";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { RangeSelector } from "@/components/RangeSelector";
import { TrendChart } from "@/components/charts/TrendChart";
import { ApiKeyBox } from "@/components/ApiKeyBox";
import { Tag } from "@/components/ui/Badge";
import { formatNumber, formatUsd } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/access";
import { colorForIndex } from "@/lib/chart-colors";

export default async function MePage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range } = await searchParams;
  const r = (range ?? "30d") as RangeKey;
  const session = await auth();

  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    include: { team: true, department: true },
  });
  if (!user) return null;

  const stats = await getUserStats(user.id, r);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{user.name}</h1>
          <p className="text-sm text-[var(--text-muted)]">
            {ROLE_LABELS[user.role]}
            {user.department ? ` · ${user.department.name}` : ""}
            {user.team ? ` · ${user.team.name}` : ""}
          </p>
        </div>
        <RangeSelector defaultRange={r} />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Tổng token" value={formatNumber(stats.totals.totalTokens)} accent="#2a78d6" icon="Σ" />
        <StatCard label="Input" value={formatNumber(stats.totals.inputTokens)} accent="#1baf7a" icon="→" />
        <StatCard label="Output" value={formatNumber(stats.totals.outputTokens)} accent="#eb6834" icon="←" />
        <StatCard label="Chi phí" value={formatUsd(stats.totals.costUsd)} accent="#e34948" icon="$" />
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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

        <Card title="Kết nối Claude Code plugin">
          <p className="mb-3 text-sm text-[var(--text-secondary)]">
            Dùng API key này khi cấu hình <code>ks-dashboard-plugin</code> để phiên làm việc Claude Code của bạn
            được ghi nhận vào dashboard.
          </p>
          <ApiKeyBox initialKey={user.apiKey} />
        </Card>
      </div>
    </div>
  );
}
