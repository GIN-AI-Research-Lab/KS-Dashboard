import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getUserStats, getUserGamification, getUserCodeStats, type RangeKey } from "@/lib/stats";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { RangeSelector } from "@/components/RangeSelector";
import { TrendChart } from "@/components/charts/lazy";
import { Tag } from "@/components/ui/Badge";
import { UserNoteEditor } from "@/components/UserNoteEditor";
import { BadgeGrid } from "@/components/BadgeGrid";
import { formatNumber, formatUsd, formatPercent } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/access";
import { colorForIndex } from "@/lib/chart-colors";
import { METRIC_HELP } from "@/lib/glossary";
import { Sigma, ArrowRight, ArrowLeft, DollarSign, Plus, Minus, Check } from "lucide-react";

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
    <div className="stagger flex flex-col gap-6">
      <div className="hero-panel relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-[var(--border)] p-6 shadow-[var(--shadow-xs)]">
        <div className="flex min-w-0 items-center gap-4">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-[var(--border)]" />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#4a3aa7]/15 text-2xl font-semibold text-[#4a3aa7]">
              {user.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/60 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-secondary)]">
              <span className="gradient-brand h-1.5 w-1.5 rounded-full" />
              THÀNH VIÊN
            </span>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              <span className="gradient-text">Hồ sơ</span> {user.name}
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {ROLE_LABELS[user.role]}
              {user.department ? ` · ${user.department.name}` : ""}
              {user.team ? ` · ${user.team.name}` : ""}
            </p>
          </div>
        </div>
        <RangeSelector defaultRange={r} />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Tổng token" value={formatNumber(stats.totals.totalTokens)} tooltip={METRIC_HELP.totalTokens} accent="#2a78d6" icon={<Sigma className="h-4 w-4" />} />
        <StatCard label="Input" value={formatNumber(stats.totals.inputTokens)} tooltip={METRIC_HELP.inputTokens} accent="#1baf7a" icon={<ArrowRight className="h-4 w-4" />} />
        <StatCard label="Output" value={formatNumber(stats.totals.outputTokens)} tooltip={METRIC_HELP.outputTokens} accent="#eb6834" icon={<ArrowLeft className="h-4 w-4" />} />
        <StatCard label="Chi phí" value={formatUsd(stats.totals.costUsd)} tooltip={METRIC_HELP.cost} accent="#e34948" icon={<DollarSign className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label="Dòng code thêm" value={formatNumber(code.linesAdded)} tooltip={METRIC_HELP.linesAdded} accent="#008300" icon={<Plus className="h-4 w-4" />} />
        <StatCard label="Dòng code xoá" value={formatNumber(code.linesRemoved)} tooltip={METRIC_HELP.linesRemoved} accent="#e34948" icon={<Minus className="h-4 w-4" />} />
        <StatCard
          label="Tỷ lệ chấp nhận sửa"
          value={code.editsAccepted + code.editsRejected > 0 ? formatPercent(code.acceptanceRate) : "—"}
          hint={`${code.editsAccepted}/${code.editsAccepted + code.editsRejected} gợi ý`}
          tooltip={METRIC_HELP.acceptanceRate}
          accent="#2a78d6"
          icon={<Check className="h-4 w-4" />}
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
