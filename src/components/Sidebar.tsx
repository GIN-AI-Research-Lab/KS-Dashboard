"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  User,
  Trophy,
  Bot,
  Wrench,
  TrendingUp,
  DollarSign,
  FlaskConical,
  Library,
  Lightbulb,
  Plug,
  Radio,
  Settings,
  Building2,
  BookOpen,
  CalendarCheck,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from "lucide-react";
import { useSidebar } from "@/components/sidebar/SidebarContext";
import { useT } from "@/i18n/I18nProvider";

/** Serializable menu item passed from the server (see resolveSidebarItems). */
export type SidebarItem = {
  key: string;
  href: string;
  icon: string;
  labelKey: string;
  exact?: boolean;
};

const ICONS: Record<string, LucideIcon> = {
  overview: LayoutDashboard,
  me: User,
  rankings: Trophy,
  models: Bot,
  tools: Wrench,
  adoption: TrendingUp,
  roi: DollarSign,
  departments: Building2,
  insights: FlaskConical,
  sessions: Library,
  library: Lightbulb,
  integrate: Plug,
  live: Radio,
  summary: CalendarCheck,
  glossary: BookOpen,
  admin: Settings,
};

function NavLink({ item }: { item: SidebarItem }) {
  const t = useT();
  const pathname = usePathname();
  const range = useSearchParams().get("range");
  const { collapsed, setMobileOpen } = useSidebar();
  const Icon = ICONS[item.icon] ?? LayoutDashboard;
  const label = t(item.labelKey);
  const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
  // Carry the active time range across navigation so it doesn't reset per page.
  const target = range ? `${item.href}?range=${range}` : item.href;
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

export function Sidebar({ items }: { items: SidebarItem[] }) {
  const t = useT();
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
            <div className="text-[11px] leading-tight text-[var(--text-muted)]">{t("nav.brandSubtitle")}</div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
          {items.map((item, i) => {
            // Visually separate the admin console from the main nav.
            const dividerBefore = item.key === "admin" && i > 0;
            return (
              <div key={item.key} className={dividerBefore ? "mt-3 border-t border-[var(--border)] pt-3" : undefined}>
                <NavLink item={item} />
              </div>
            );
          })}
        </nav>

        <button
          onClick={toggleCollapsed}
          title={collapsed ? t("nav.expand") : t("nav.collapse")}
          aria-label={collapsed ? t("nav.expand") : t("nav.collapse")}
          className={`mt-2 hidden items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-black/[0.04] hover:text-[var(--text-primary)] md:flex dark:hover:bg-white/[0.06] ${
            collapsed ? "md:justify-center" : ""
          }`}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
          ) : (
            <PanelLeftClose className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
          )}
          <span className={collapsed ? "md:hidden" : ""}>{t("nav.collapse")}</span>
        </button>
      </aside>
    </>
  );
}
