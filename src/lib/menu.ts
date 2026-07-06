import type { Role } from "@prisma/client";

// ---------------------------------------------------------------------------
// Canonical menu registry
// ---------------------------------------------------------------------------
// Single source of truth for the sidebar navigation. Admin-editable state
// (visible / order) lives in the `MenuSetting` table and is merged on top of
// these defaults at request time; role gating and "always accessible" flags are
// intrinsic to the route and stay in code so they can't be misconfigured away.
//
// `icon` is a string key resolved to a Lucide component in the (client) Sidebar.
// `labelKey` is an i18n key resolved via the active dictionary (see src/i18n).

export type MenuKey =
  | "overview"
  | "rankings"
  | "models"
  | "library"
  | "live"
  | "integrate"
  | "departments"
  | "me"
  | "tools"
  | "adoption"
  | "roi"
  | "insights"
  | "sessions"
  | "summary"
  | "glossary"
  | "admin";

export interface MenuItemDef {
  key: MenuKey;
  href: string;
  icon: string;
  labelKey: string;
  /** Active-state matching uses exact equality instead of prefix (for "/"). */
  exact?: boolean;
  /** Shown in the sidebar by default (the 7 core menus). */
  defaultVisible: boolean;
  /** Default sort order in the sidebar. */
  defaultOrder: number;
  /** Baseline roles allowed to reach this route. undefined = any signed-in user. */
  roles?: Role[];
  /**
   * Reachable by URL even when hidden from the sidebar (e.g. the profile page,
   * which is linked from the topbar avatar). Such routes are never URL-blocked
   * just because they're not in the visible nav list.
   */
  alwaysAccessible?: boolean;
}

// Order here == default sidebar order. The first 7 are visible by default.
export const MENU_ITEMS: readonly MenuItemDef[] = [
  { key: "overview", href: "/", icon: "overview", labelKey: "nav.overview", exact: true, defaultVisible: true, defaultOrder: 0 },
  { key: "rankings", href: "/rankings", icon: "rankings", labelKey: "nav.rankings", defaultVisible: true, defaultOrder: 1 },
  { key: "models", href: "/models", icon: "models", labelKey: "nav.models", defaultVisible: true, defaultOrder: 2 },
  { key: "library", href: "/library", icon: "library", labelKey: "nav.library", defaultVisible: true, defaultOrder: 3 },
  { key: "live", href: "/live", icon: "live", labelKey: "nav.live", defaultVisible: true, defaultOrder: 4 },
  { key: "integrate", href: "/integrate", icon: "integrate", labelKey: "nav.integrate", defaultVisible: true, defaultOrder: 5 },
  { key: "departments", href: "/departments", icon: "departments", labelKey: "nav.departments", defaultVisible: true, defaultOrder: 6, roles: ["ADMIN", "DEPARTMENT_HEAD"] },

  // Hidden by default -- admin can switch these on / reorder them.
  { key: "me", href: "/me", icon: "me", labelKey: "nav.me", defaultVisible: false, defaultOrder: 7, alwaysAccessible: true },
  { key: "tools", href: "/tools", icon: "tools", labelKey: "nav.tools", defaultVisible: false, defaultOrder: 8 },
  { key: "adoption", href: "/adoption", icon: "adoption", labelKey: "nav.adoption", defaultVisible: false, defaultOrder: 9 },
  { key: "roi", href: "/roi", icon: "roi", labelKey: "nav.roi", defaultVisible: false, defaultOrder: 10 },
  { key: "insights", href: "/insights", icon: "insights", labelKey: "nav.insights", defaultVisible: false, defaultOrder: 11 },
  // Consolidated into /live in the nav, but its detail pages are still linked
  // from search / other pages, so keep it reachable by URL when hidden.
  { key: "sessions", href: "/sessions", icon: "sessions", labelKey: "nav.sessions", defaultVisible: false, defaultOrder: 12, alwaysAccessible: true },
  { key: "summary", href: "/summary", icon: "summary", labelKey: "nav.summary", defaultVisible: false, defaultOrder: 13 },
  { key: "glossary", href: "/glossary", icon: "glossary", labelKey: "nav.glossary", defaultVisible: false, defaultOrder: 14 },

  // Admin console -- only ADMIN sees or reaches it.
  { key: "admin", href: "/admin", icon: "admin", labelKey: "nav.admin", defaultVisible: true, defaultOrder: 100, roles: ["ADMIN"] },
];

export const MENU_BY_KEY: Record<MenuKey, MenuItemDef> = Object.fromEntries(
  MENU_ITEMS.map((m) => [m.key, m]),
) as Record<MenuKey, MenuItemDef>;

/** Admin-editable per-menu state, keyed by MenuKey. */
export type MenuSettingMap = Partial<Record<MenuKey, { visible: boolean; sortOrder: number }>>;

/** A menu item with its admin overrides applied. */
export interface ResolvedMenuItem extends MenuItemDef {
  visible: boolean;
  order: number;
}

function roleAllowed(item: MenuItemDef, role: Role): boolean {
  // ADMIN can reach everything (needed to manage hidden/restricted menus).
  if (role === "ADMIN") return true;
  if (!item.roles) return true;
  return item.roles.includes(role);
}

/**
 * Merge the code defaults with the admin's saved settings and the viewer's role.
 * Returns every item the viewer is *allowed* to see, each annotated with its
 * effective visibility + order. Callers filter/sort as needed.
 */
export function resolveMenuItems(role: Role, settings: MenuSettingMap): ResolvedMenuItem[] {
  return MENU_ITEMS.filter((item) => roleAllowed(item, role))
    .map((item) => {
      const override = settings[item.key];
      return {
        ...item,
        visible: override?.visible ?? item.defaultVisible,
        order: override?.sortOrder ?? item.defaultOrder,
      };
    })
    .sort((a, b) => a.order - b.order);
}

/** The items actually rendered in the sidebar for a viewer (visible + allowed, sorted). */
export function resolveSidebarItems(role: Role, settings: MenuSettingMap): ResolvedMenuItem[] {
  return resolveMenuItems(role, settings).filter((item) => item.visible);
}

/**
 * Find the menu item that owns a pathname. Matches "/" exactly (overview) and
 * every other route by prefix so detail pages (e.g. /departments/x, /live/y)
 * inherit their parent menu's access rules. Longest href wins.
 */
export function matchMenuByPath(pathname: string): MenuItemDef | null {
  let best: MenuItemDef | null = null;
  for (const item of MENU_ITEMS) {
    if (item.exact) {
      if (pathname === item.href) return item;
      continue;
    }
    if (pathname === item.href || pathname.startsWith(item.href + "/")) {
      if (!best || item.href.length > best.href.length) best = item;
    }
  }
  return best;
}

/**
 * URL-level access decision for the proxy guard. A signed-in user may reach a
 * route when their role is allowed AND (the menu is visible, OR they're an
 * admin, OR the route is flagged always-accessible like the profile page).
 * Routes with no owning menu (e.g. /users/[id]) are allowed here and rely on
 * their own in-page guards.
 */
export function canAccessPath(pathname: string, role: Role, settings: MenuSettingMap): boolean {
  const item = matchMenuByPath(pathname);
  if (!item) return true;
  if (!roleAllowed(item, role)) return false;
  if (role === "ADMIN" || item.alwaysAccessible) return true;
  const visible = settings[item.key]?.visible ?? item.defaultVisible;
  return visible;
}

// Routes for concepts that were removed from the product (Projects, Teams).
// Their page files still exist but the concept is gone from navigation, so they
// must not be reachable by URL either -- the proxy redirects these away.
const DEPRECATED_PATHS = ["/projects", "/teams"];

export function isDeprecatedPath(pathname: string): boolean {
  return DEPRECATED_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}
