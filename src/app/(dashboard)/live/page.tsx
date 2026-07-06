import { prisma } from "@/lib/db";
import { getLiveSessions, type LiveSessionStatusFilter } from "@/lib/stats";
import { Card } from "@/components/ui/Card";
import { LiveFilters } from "@/components/live/LiveFilters";
import { LiveTable, type LiveRow } from "@/components/live/LiveTable";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";

function parseDate(value: string | undefined, endOfDay = false): Date | undefined {
  if (!value || Number.isNaN(Date.parse(value))) return undefined;
  return new Date(endOfDay ? `${value}T23:59:59` : value);
}

export default async function LivePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; department?: string; status?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const departmentId = sp.department || undefined;
  const status: LiveSessionStatusFilter | undefined =
    sp.status === "online" || sp.status === "ended" ? sp.status : undefined;
  const from = parseDate(sp.from);
  const to = parseDate(sp.to, true);

  const [t, departments, sessions] = await Promise.all([
    getT(),
    prisma.department.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    getLiveSessions({ q, departmentId, from, to, status, limit: 200 }),
  ]);

  const rows: LiveRow[] = sessions.map((s) => ({
    id: s.id,
    userId: s.userId,
    userName: s.userName,
    image: s.image,
    department: s.department,
    team: s.team,
    projectLabel: s.projectLabel,
    model: s.model,
    status: s.status,
    startedAt: s.startedAt.toISOString(),
    lastEventAt: s.lastEventAt.toISOString(),
    costUsd: s.costUsd,
    turnCount: s.turnCount,
    toolCallCount: s.toolCallCount,
  }));

  return (
    <div className="stagger flex flex-col gap-6">
      <div className="hero-panel relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-[var(--border)] p-6 shadow-[var(--shadow-xs)]">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/60 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-secondary)]">
            <span className="gradient-brand h-1.5 w-1.5 animate-pulse rounded-full" />
            {t("live.title")}
          </span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{t("live.title")}</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{t("live.subtitle")}</p>
        </div>
      </div>

      <LiveFilters departments={departments} />

      <Card title={`${rows.length} ${t("live.resultCount")}`}>
        <LiveTable rows={rows} />
      </Card>
    </div>
  );
}
