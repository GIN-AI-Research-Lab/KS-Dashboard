"use client";

import { Menu } from "lucide-react";
import { useSidebar } from "@/components/sidebar/SidebarContext";
import { useT } from "@/i18n/I18nProvider";

export function MobileMenuButton() {
  const { setMobileOpen } = useSidebar();
  const t = useT();
  return (
    <button
      type="button"
      onClick={() => setMobileOpen(true)}
      aria-label={t("ui.openMenu")}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-black/[0.04] hover:text-[var(--text-primary)] md:hidden dark:hover:bg-white/[0.06]"
    >
      <Menu className="h-5 w-5" />
    </button>
  );
}
