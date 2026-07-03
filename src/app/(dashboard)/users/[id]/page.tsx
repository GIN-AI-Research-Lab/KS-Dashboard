import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getUserStats, getUserGamification, getUserCodeStats, type RangeKey } from "@/lib/stats";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { RangeSelector } from "@/components/RangeSelector";
import { TrendChart } from "@/components/charts/TrendChart";
import { Tag } from "@/components/ui/Badge";
import { UserNoteEditor } from "@/components/UserNoteEditor";
import { BadgeGrid } from "@/components/BadgeGrid";
import { formatNumber, formatUsd, formatPercent } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/access";
import { colorForIndex } from "@/lib/chart-colors";

export default async function UserPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { id } = await params;
  const { range } = await searchParams;
  const r = (range ?? "30d") as RangeKey;

  const [session, user] = await Promise.all([
    auth(),
    prisma.user.findUnique({ where: { id }, include: { team: true, department: true } }),
  ]);
  if (!user) notFound();
  const isAdmin = session!.user.role === "ADMIN";

  const [stats, gami, code] = await Promise.all([getUserStats(id, r), getUserGamification(id), getUserCodeStats(id, r)]);

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

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label="Dòng code thêm" value={formatNumber(code.linesAdded)} accent="#008300" icon="＋" />
        <StatCard label="Dòng code xoá" value={formatNumber(code.linesRemoved)} accent="#e34948" icon="－" />
        <StatCard
          label="Tỷ lệ chấp nhận sửa"
          value={code.editsAccepted + code.editsRejected > 0 ? formatPercent(code.acceptanceRate) : "—"}
          hint={`${code.editsAccepted}/${code.editsAccepted + code.editsRejected} gợi ý`}
          accent="#2a78d6"
          icon="✓"
        />
      </div>

      {/* Ghi chú nội bộ là annotation của quản trị -> chỉ admin xem/sửa. */}
      {isAdmin && (
        <Card title="Ghi chú nội bộ (chỉ admin)">
          <UserNoteEditor userId={user.id} initialNote={user.note} />
        </Card>
      )}

      <Card title="Token theo ngày">
        <TrendChart
          data={stats.daily}
          series={[
            { key: "inputTokens", label: "Input", color: "#2a78d6" },
            { key: "outputTokens", label: "Output", color: "#eb6834" },
          ]}
        />
      </Card>

      <Card title="Huy hiệu">
        <BadgeGrid badges={gami.badges} earnedCount={gami.earnedCount} totalCount={gami.totalCount} />
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
  );
}
