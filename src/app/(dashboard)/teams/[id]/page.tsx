import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getTeamStats, getMemberBreakdown, type RangeKey } from "@/lib/stats";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { RangeSelector } from "@/components/RangeSelector";
import { TrendChart } from "@/components/charts/TrendChart";
import { MemberTable } from "@/components/MemberTable";
import { Tag } from "@/components/ui/Badge";
import { formatNumber, formatUsd } from "@/lib/format";
import { colorForIndex } from "@/lib/chart-colors";

export default async function TeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { id } = await params;
  const { range } = await searchParams;
  const r = (range ?? "30d") as RangeKey;

  const team = await prisma.team.findUnique({
    where: { id },
    include: { department: true, users: { select: { id: true, name: true } } },
  });
  if (!team) notFound();

  const [stats, members] = await Promise.all([
    getTeamStats(id, r),
    getMemberBreakdown(team.users.map((u) => u.id), r),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{team.name}</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Nhóm · {team.department.name} · {team.users.length} thành viên
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
        <Card title="Thành viên">
          <MemberTable members={members} />
        </Card>
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
    </div>
  );
}
