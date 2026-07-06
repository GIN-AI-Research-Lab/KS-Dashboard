// Server-side loader for the admin-controlled menu configuration. Reads the
// MenuSetting rows (cached briefly, since the sidebar renders on every page and
// the config changes rarely) and merges them onto the code defaults.

import { prisma } from "@/lib/db";
import { cached, invalidateCache } from "@/lib/cache";
import type { MenuKey, MenuSettingMap } from "@/lib/menu";

const CACHE_KEY = "menu-settings";
const TTL_MS = 5_000;

export async function getMenuSettings(): Promise<MenuSettingMap> {
  return cached(CACHE_KEY, TTL_MS, async () => {
    try {
      const rows = await prisma.menuSetting.findMany();
      const map: MenuSettingMap = {};
      for (const row of rows) {
        map[row.key as MenuKey] = { visible: row.visible, sortOrder: row.sortOrder };
      }
      return map;
    } catch {
      // Table missing (pre-migration) or DB hiccup: fall back to code defaults so
      // the sidebar + proxy keep working instead of 500-ing every navigation.
      return {};
    }
  });
}

export function invalidateMenuSettings(): void {
  invalidateCache(CACHE_KEY);
}
