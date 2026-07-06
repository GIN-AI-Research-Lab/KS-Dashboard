import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { IngestionHealth } from "@/components/admin/IngestionHealth";
import { MenuSettings, type MenuSettingRow } from "@/components/admin/MenuSettings";
import { Card } from "@/components/ui/Card";
import { getIngestionHealth } from "@/lib/stats";
import { getMenuSettings } from "@/lib/menu-config";
import { resolveMenuItems, type ResolvedMenuItem } from "@/lib/menu";
import { getT } from "@/i18n/server";

export default async function AdminPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/");

  const [departments, users, health, menuSettings, t] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: "asc" }, include: { users: true } }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        departmentId: true,
        createdAt: true,
      },
    }),
    getIngestionHealth(),
    getMenuSettings(),
    getT(),
  ]);

  const toMenuRow = (m: ResolvedMenuItem): MenuSettingRow => ({
    key: m.key,
    labelKey: m.labelKey,
    href: m.href,
    visible: m.visible,
    restricted: !!m.roles,
    alwaysAccessible: !!m.alwaysAccessible,
  });
  const menuItems = resolveMenuItems("ADMIN", menuSettings).map(toMenuRow);
  const menuDefaults = resolveMenuItems("ADMIN", {}).map(toMenuRow);

  return (
    <div className="stagger flex flex-col gap-6">
      <div className="hero-panel relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-[var(--border)] p-6 shadow-[var(--shadow-xs)]">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/60 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-secondary)]">
            <span className="gradient-brand h-1.5 w-1.5 rounded-full" />
            {t("admin.title")}
          </span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight"><span className="gradient-text">{t("admin.title")}</span></h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{t("admin.subtitle")}</p>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          {t("ingestion.heading")}
        </h2>
        <IngestionHealth summary={health.summary} rows={health.rows} t={t} />
      </div>

      <AdminPanel
        initialDepartments={departments.map((d) => ({ id: d.id, name: d.name, userCount: d.users.length }))}
        initialUsers={users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          departmentId: u.departmentId,
          createdAt: u.createdAt.toISOString(),
        }))}
      />

      <Card title={t("settings.title")}>
        <MenuSettings initialItems={menuItems} defaultItems={menuDefaults} />
      </Card>
    </div>
  );
}
