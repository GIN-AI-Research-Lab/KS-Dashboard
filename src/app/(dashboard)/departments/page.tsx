import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getRankingMovement, type RangeKey, type RankingMetric } from "@/lib/stats";
import { Card } from "@/components/ui/Card";
import { RangeSelector } from "@/components/RangeSelector";
import { MetricTabs } from "@/components/MetricTabs";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { DepartmentFilter } from "@/components/DepartmentFilter";
import { getT } from "@/i18n/server";

const METRICS: { key: RankingMetric; labelKey: string; unitKey: string; format: "number" | "usd" | "duration" }[] = [
  { key: "totalTokens", labelKey: "metrics.totalTokens", unitKey: "metrics.unitToken", format: "number" },
  { key: "inputTokens", labelKey: "metrics.inputTop", unitKey: "metrics.unitToken", format: "number" },
  { key: "outputTokens", labelKey: "metrics.outputTop", unitKey: "metrics.unitToken", format: "number" },
  { key: "costUsd", labelKey: "metrics.costMost", unitKey: "metrics.unitUsd", format: "usd" },
  { key: "sessionDuration", labelKey: "metrics.longest", unitKey: "metrics.unitTime", format: "duration" },
  { key: "turnCount", labelKey: "metrics.mostTurns", unitKey: "metrics.unitTurns", format: "number" },
];

export default async function DepartmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; metric?: string; department?: string }>;
}) {
  const session = await auth();
  const user = session?.user;
  // Belt-and-suspenders alongside the proxy guard.
  if (!user || (user.role !== "ADMIN" && user.role !== "DEPARTMENT_HEAD")) redirect("/");

  const { range, metric, department } = await searchParams;
  const r = (range ?? "30d") as RangeKey;
  const activeMetric = METRICS.find((m) => m.key === metric) ?? METRICS[0];
  const isAdmin = user.role === "ADMIN";

  const [t, departments] = await Promise.all([
    getT(),
    isAdmin
      ? prisma.department.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } })
      : user.departmentId
        ? prisma.department.findMany({ where: { id: user.departmentId }, select: { id: true, name: true } })
        : Promise.resolve([]),
  ]);

  // Department heads are locked to their own department; admins pick via the URL.
  const selectedDeptId = isAdmin ? (department && department !== "all" ? department : null) : user.departmentId ?? null;
  const lockedDeptMissing = !isAdmin && !user.departmentId;

  let rows = lockedDeptMissing ? [] : await getRankingMovement(activeMetric.key, r, 1000);

  if (selectedDeptId && rows.length > 0) {
    // Resolve department membership the same way getDepartmentStats does: direct
    // members plus members via a team that belongs to the department.
    const members = await prisma.user.findMany({
      where: { OR: [{ departmentId: selectedDeptId }, { team: { departmentId: selectedDeptId } }] },
      select: { id: true },
    });
    const ids = new Set(members.map((m) => m.id));
    rows = rows.filter((row) => ids.has(row.userId));
  }

  return (
    <div className="stagger flex flex-col gap-6">
      <div className="hero-panel relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-[var(--border)] p-6 shadow-[var(--shadow-xs)]">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/60 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-secondary)]">
            <span className="gradient-brand h-1.5 w-1.5 rounded-full" />
            {t("departments.title")}
          </span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{t("departments.title")}</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{t("departments.subtitle")}</p>
        </div>
        <RangeSelector defaultRange={r} />
      </div>

      {isAdmin ? (
        <DepartmentFilter label={t("departments.filterLabel")} options={departments} allLabel={t("common.all")} />
      ) : lockedDeptMissing ? (
        <p className="text-sm text-[var(--text-muted)]">{t("departments.noDepartment")}</p>
      ) : (
        <p className="text-sm text-[var(--text-secondary)]">
          <span className="text-[var(--text-muted)]">{t("departments.yourDepartment")}: </span>
          <span className="font-medium">{departments[0]?.name ?? "—"}</span>
        </p>
      )}

      <MetricTabs options={METRICS.map((m) => ({ key: m.key, label: t(m.labelKey) }))} defaultValue={METRICS[0].key} />

      <Card title={t(activeMetric.labelKey)}>
        <LeaderboardTable rows={rows} valueLabel={t(activeMetric.unitKey)} valueFormat={activeMetric.format} />
      </Card>
    </div>
  );
}
