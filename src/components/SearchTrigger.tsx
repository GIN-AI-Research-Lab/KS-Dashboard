"use client";

import { Search } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";

export function SearchTrigger() {
  const t = useT();
  return (
    <button
      onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
      className="flex h-9 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-xs text-[var(--text-muted)] transition-colors duration-150 hover:border-accent hover:bg-black/5 hover:text-accent dark:hover:bg-white/10"
    >
      <Search className="h-4 w-4" aria-hidden />
      <span>{t("chrome.search")}</span>
      <kbd className="rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] leading-none text-[var(--text-muted)]">⌘K</kbd>
    </button>
  );
}
