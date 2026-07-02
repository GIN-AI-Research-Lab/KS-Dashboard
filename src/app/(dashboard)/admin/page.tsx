import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { AdminPanel } from "@/components/admin/AdminPanel";

export default async function AdminPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/");

  const [departments, teams, users] = await Promise.all([
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
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Quản trị</h1>
        <p className="text-sm text-[var(--text-muted)]">Quản lý bộ phận, nhóm và tài khoản nhân viên</p>
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
