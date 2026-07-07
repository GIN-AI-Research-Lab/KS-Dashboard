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
import { Avatar } from "@/components/Avatar";
import { formatNumber, formatUsd, formatPercent } from "@/lib/format";
import { colorForIndex } from "@/lib/chart-colors";
import { getMetricHelp } from "@/lib/glossary";
import { getT } from "@/i18n/server";
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

  const [session, user, t] = await Promise.all([
    auth(),
    prisma.user.findUnique({ where: { id }, include: { department: true } }),
    getT(),
  ]);
  if (!user) notFound();
  const isAdmin = session!.user.role === "ADMIN";
  const METRIC_HELP = getMetricHelp(t);

  const [stats, gami, code] = await Promise.all([getUserStats(id, r), getUserGamification(id), getUserCodeStats(id, r)]);

  return (
    <div className="stagger flex flex-col gap-6">
      <div className="hero-panel relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-[var(--border)] p-6 shadow-[var(--shadow-xs)]">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar image={user.image} name={user.name} className="h-16 w-16 ring-2 ring-[var(--border)]" iconClassName="h-8 w-8" />
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/60 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-secondary)]">
              <span className="gradient-brand h-1.5 w-1.5 rounded-full" />
              {t("userDetail.badge")}
            </span>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              <span className="gradient-text">{t("userDetail.titlePrefix")}</span> {user.name}
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {t(`roles.${user.role}`)}
              {user.department ? ` · ${user.department.name}` : ""}
            </p>
          </div>
        </div>
        <RangeSelector defaultRange={r} />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label={t("overview.totalTokens")} value={formatNumber(stats.totals.totalTokens)} tooltip={METRIC_HELP.totalTokens} accent="#2a78d6" icon={<Sigma className="h-4 w-4" />} />
        <StatCard label={t("table.input")} value={formatNumber(stats.totals.inputTokens)} tooltip={METRIC_HELP.inputTokens} accent="#1baf7a" icon={<ArrowRight className="h-4 w-4" />} />
        <StatCard label={t("table.output")} value={formatNumber(stats.totals.outputTokens)} tooltip={METRIC_HELP.outputTokens} accent="#eb6834" icon={<ArrowLeft className="h-4 w-4" />} />
        <StatCard label={t("table.cost")} value={formatUsd(stats.totals.costUsd)} tooltip={METRIC_HELP.cost} accent="#e34948" icon={<DollarSign className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label={t("overview.linesAdded")} value={formatNumber(code.linesAdded)} tooltip={METRIC_HELP.linesAdded} accent="#008300" icon={<Plus className="h-4 w-4" />} />
        <StatCard label={t("overview.linesRemoved")} value={formatNumber(code.linesRemoved)} tooltip={METRIC_HELP.linesRemoved} accent="#e34948" icon={<Minus className="h-4 w-4" />} />
        <StatCard
          label={t("overview.acceptanceRate")}
          value={code.editsAccepted + code.editsRejected > 0 ? formatPercent(code.acceptanceRate) : "—"}
          hint={`${code.editsAccepted}/${code.editsAccepted + code.editsRejected} ${t("overview.acceptanceHintSuffix")}`}
          tooltip={METRIC_HELP.acceptanceRate}
          accent="#2a78d6"
          icon={<Check className="h-4 w-4" />}
        />
      </div>

      {isAdmin && (
        <Card title={t("userDetail.internalNoteTitle")}>
          <UserNoteEditor userId={user.id} initialNote={user.note} />
        </Card>
      )}

      <Card title={t("overview.tokensByDay")}>
        <TrendChart
          data={stats.daily}
          series={[
            { key: "inputTokens", label: "Input", color: "#2a78d6" },
            { key: "outputTokens", label: "Output", color: "#eb6834" },
          ]}
        />
      </Card>

      <Card title={t("userDetail.badgesTitle")}>
        <BadgeGrid badges={gami.badges} earnedCount={gami.earnedCount} totalCount={gami.totalCount} />
      </Card>

      <Card title={t("userDetail.topToolsTitle")}>
        {stats.topTools.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">{t("common.noData")}</p>
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
