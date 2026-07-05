"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { Role } from "@prisma/client";
import {
  LayoutDashboard,
  User,
  Trophy,
  Bot,
  Wrench,
  TrendingUp,
  DollarSign,
  FolderKanban,
  FlaskConical,
  Library,
  Lightbulb,
  Plug,
  Radio,
  Settings,
  Building2,
  BookOpen,
  CalendarCheck,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from "lucide-react";
import { useSidebar } from "@/components/sidebar/SidebarContext";

type OrgTree = { id: string; name: string; teams: { id: string; name: string }[] }[];

const ICONS: Record<string, LucideIcon> = {
  overview: LayoutDashboard,
  me: User,
  rankings: Trophy,
  models: Bot,
  tools: Wrench,
  adoption: TrendingUp,
  roi: DollarSign,
  projects: FolderKanban,
  insights: FlaskConical,
  sessions: Library,
  library: Lightbulb,
  integrate: Plug,
  live: Radio,
  summary: CalendarCheck,
  glossary: BookOpen,
  admin: Settings,
};

function NavLink({
  href,
  label,
  icon: Icon,
  exact,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const range = useSearchParams().get("range");
  const { collapsed, setMobileOpen } = useSidebar();
  const active = exact ? pathname === href : pathname.startsWith(href);
  // Carry the active time range across navigation so it doesn't reset per page.
  const target = range ? `${href}?range=${range}` : href;
  return (
    <Link
      href={target}
      title={collapsed ? label : undefined}
      onClick={() => setMobileOpen(false)}
      aria-current={active ? "page" : undefined}
      className={`group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
        collapsed ? "md:justify-center" : ""
      } ${
        active
          ? "bg-[var(--accent-weak)] text-[var(--accent)]"
          : "text-[var(--text-secondary)] hover:bg-black/[0.04] hover:text-[var(--text-primary)] dark:hover:bg-white/[0.06]"
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-[var(--accent)]" />
      )}
      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={active ? 2.25 : 2} />
      <span className={collapsed ? "md:hidden" : ""}>{label}</span>
    </Link>
  );
}

export function Sidebar({ orgTree, role }: { orgTree: OrgTree; role: Role }) {
  const [orgOpen, setOrgOpen] = useState(true);
  const pathname = usePathname();
  const range = useSearchParams().get("range");
  const withRange = (h: string) => (range ? `${h}?range=${range}` : h);
  const { collapsed, toggleCollapsed, mobileOpen, setMobileOpen } = useSidebar();

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          aria-hidden="true"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-full w-64 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] px-3 py-4 transition-[transform,width] duration-200 md:static md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "md:w-[4.5rem]" : "md:w-64"}`}
      >
        <div
          className={`mb-6 flex items-center gap-2.5 px-2 ${
            collapsed ? "md:justify-center md:px-0" : ""
          }`}
        >
          <div className="gradient-brand flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white shadow-[var(--shadow-sm)]">
            KS
          </div>
          <div className={collapsed ? "md:hidden" : ""}>
            <div className="text-sm font-semibold leading-tight tracking-tight">KS Dashboard</div>
            <div className="text-[11px] leading-tight text-[var(--text-muted)]">Claude usage analytics</div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
          <NavLink href="/" label="Tổng quan" icon={ICONS.overview} exact />
          <NavLink href="/me" label="Cá nhân" icon={ICONS.me} />
          <NavLink href="/rankings" label="Xếp hạng" icon={ICONS.rankings} />
          <NavLink href="/models" label="Model" icon={ICONS.models} />
          <NavLink href="/tools" label="Công cụ" icon={ICONS.tools} />
          <NavLink href="/adoption" label="Áp dụng" icon={ICONS.adoption} />
          <NavLink href="/roi" label="Hiệu quả & Chi phí" icon={ICONS.roi} />
          <NavLink href="/projects" label="Dự án" icon={ICONS.projects} />
          <NavLink href="/insights" label="Phân tích sâu" icon={ICONS.insights} />
          <NavLink href="/sessions" label="Thư viện phiên" icon={ICONS.sessions} />
          <NavLink href="/library" label="Thư viện" icon={ICONS.library} />
          <NavLink href="/integrate" label="Tích hợp Claude" icon={ICONS.integrate} />
          <NavLink href="/live" label="Phiên trực tuyến" icon={ICONS.live} />
          <NavLink href="/summary" label="Tóm tắt tuần" icon={ICONS.summary} />
          <NavLink href="/glossary" label="Thuật ngữ" icon={ICONS.glossary} />

          <div className={collapsed ? "md:hidden" : ""}>
            <button
              onClick={() => setOrgOpen((v) => !v)}
              className="mt-3 flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
            >
              <span className="flex items-center gap-2">
                <Building2 className="h-[18px] w-[18px]" /> Bộ phận / Nhóm
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${orgOpen ? "" : "-rotate-90"}`}
              />
            </button>
            {orgOpen && (
              <div className="ml-2 flex flex-col gap-0.5 border-l border-[var(--border)] pl-3">
                {orgTree.map((dept) => (
                  <div key={dept.id}>
                    <Link
                      href={withRange(`/departments/${dept.id}`)}
                      onClick={() => setMobileOpen(false)}
                      className={`block truncate rounded-md px-2 py-1.5 text-sm transition-colors ${
                        pathname === `/departments/${dept.id}`
                          ? "font-medium text-[var(--accent)]"
                          : "text-[var(--text-secondary)] hover:bg-black/[0.04] hover:text-[var(--text-primary)] dark:hover:bg-white/[0.06]"
                      }`}
                    >
                      {dept.name}
                    </Link>
                    {dept.teams.map((team) => (
                      <Link
                        key={team.id}
                        href={withRange(`/teams/${team.id}`)}
                        onClick={() => setMobileOpen(false)}
                        className={`ml-3 block truncate rounded-md px-2 py-1 text-[13px] transition-colors ${
                          pathname === `/teams/${team.id}`
                            ? "font-medium text-[var(--accent)]"
                            : "text-[var(--text-muted)] hover:bg-black/[0.04] hover:text-[var(--text-secondary)] dark:hover:bg-white/[0.06]"
                        }`}
                      >
                        · {team.name}
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {role === "ADMIN" && (
            <div className="mt-3 border-t border-[var(--border)] pt-3">
              <NavLink href="/admin" label="Quản trị" icon={ICONS.admin} />
            </div>
          )}
        </nav>

        <button
          onClick={toggleCollapsed}
          title={collapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
          aria-label={collapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
          className={`mt-2 hidden items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-black/[0.04] hover:text-[var(--text-primary)] md:flex dark:hover:bg-white/[0.06] ${
            collapsed ? "md:justify-center" : ""
          }`}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
          ) : (
            <PanelLeftClose className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
          )}
          <span className={collapsed ? "md:hidden" : ""}>Thu gọn</span>
        </button>
      </aside>
    </>
  );
}
