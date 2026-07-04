import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { IngestionHealth } from "@/components/admin/IngestionHealth";
import { getIngestionHealth } from "@/lib/stats";

export default async function AdminPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/");

  const [departments, teams, users, health] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: "asc" }, include: { teams: true, users: true } }),
    prisma.team.findMany({ orderBy: { name: "asc" }, include: { department: true, users: true } }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        teamId: true,
        departmentId: true,
        createdAt: true,
      },
    }),
    getIngestionHealth(),
  ]);

  return (
    <div className="stagger flex flex-col gap-6">
      <div className="hero-panel relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-[var(--border)] p-6 shadow-[var(--shadow-xs)]">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/60 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-secondary)] backdrop-blur">
            <span className="gradient-brand h-1.5 w-1.5 rounded-full" />
            QUẢN TRỊ
          </span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Quản <span className="gradient-text">trị</span></h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Quản lý bộ phận, nhóm và tài khoản nhân viên</p>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Tình trạng thu thập dữ liệu
        </h2>
        <IngestionHealth summary={health.summary} rows={health.rows} />
      </div>

      <AdminPanel
        initialDepartments={departments.map((d) => ({ id: d.id, name: d.name, teamCount: d.teams.length, userCount: d.users.length }))}
        initialTeams={teams.map((t) => ({ id: t.id, name: t.name, departmentId: t.departmentId, departmentName: t.department.name, userCount: t.users.length }))}
        initialUsers={users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          teamId: u.teamId,
          departmentId: u.departmentId,
          createdAt: u.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
