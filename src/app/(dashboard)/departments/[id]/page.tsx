import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getDepartmentStats, getMemberBreakdown, type RangeKey } from "@/lib/stats";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { RangeSelector } from "@/components/RangeSelector";
import { TrendChart } from "@/components/charts/TrendChart";
import { MemberTable } from "@/components/MemberTable";
import { formatNumber, formatUsd } from "@/lib/format";
import { METRIC_HELP } from "@/lib/glossary";
import { Sigma, ArrowDownToLine, ArrowUpFromLine, DollarSign } from "lucide-react";

export default async function DepartmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { id } = await params;
  const { range } = await searchParams;
  const r = (range ?? "30d") as RangeKey;

  const department = await prisma.department.findUnique({
    where: { id },
    include: {
      teams: { include: { users: { select: { id: true } } } },
      users: { where: { teamId: null }, select: { id: true, name: true } },
    },
  });
  if (!department) notFound();

  const allUserIds = [
    ...department.users.map((u) => u.id),
    ...department.teams.flatMap((t) => t.users.map((u) => u.id)),
  ];

  const [stats, members] = await Promise.all([
    getDepartmentStats(id, r),
    getMemberBreakdown(allUserIds, r),
  ]);

  return (
    <div className="stagger flex flex-col gap-6">
      <div className="hero-panel relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-[var(--border)] p-6 shadow-[var(--shadow-xs)]">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/60 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-secondary)]">
            <span className="gradient-brand h-1.5 w-1.5 rounded-full" />
            BỘ PHẬN
          </span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            <span className="gradient-text">Bộ phận</span> {department.name}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {department.teams.length} nhóm · {allUserIds.length} thành viên
          </p>
        </div>
        <RangeSelector defaultRange={r} />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Tổng token" value={formatNumber(stats.totals.totalTokens)} accent="#2a78d6" icon={<Sigma className="h-4 w-4" />} tooltip={METRIC_HELP.totalTokens} />
        <StatCard label="Input" value={formatNumber(stats.totals.inputTokens)} accent="#1baf7a" icon={<ArrowDownToLine className="h-4 w-4" />} tooltip={METRIC_HELP.inputTokens} />
        <StatCard label="Output" value={formatNumber(stats.totals.outputTokens)} accent="#eb6834" icon={<ArrowUpFromLine className="h-4 w-4" />} tooltip={METRIC_HELP.outputTokens} />
        <StatCard label="Chi phí" value={formatUsd(stats.totals.costUsd)} accent="#e34948" icon={<DollarSign className="h-4 w-4" />} tooltip={METRIC_HELP.cost} />
      </div>

      <Card title="Token theo ngày" titleTip={METRIC_HELP.totalTokens}>
        <TrendChart
          data={stats.daily}
          series={[
            { key: "inputTokens", label: "Input", color: "#2a78d6" },
            { key: "outputTokens", label: "Output", color: "#eb6834" },
          ]}
        />
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Các nhóm">
          <div className="flex flex-col gap-1">
            {department.teams.map((t) => (
              <Link
                key={t.id}
                href={`/teams/${t.id}`}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/10"
              >
                <span className="font-medium">{t.name}</span>
                <span className="text-xs text-[var(--text-muted)]">{t.users.length} thành viên</span>
              </Link>
            ))}
            {department.teams.length === 0 && (
              <p className="text-sm text-[var(--text-muted)]">Chưa có nhóm nào</p>
            )}
          </div>
        </Card>
        <Card title="Tất cả thành viên">
          <MemberTable members={members} />
        </Card>
      </div>
    </div>
  );
}
