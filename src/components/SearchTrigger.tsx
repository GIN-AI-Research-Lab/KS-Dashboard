"use client";

import { Search } from "lucide-react";

export function SearchTrigger() {
  return (
    <button
      onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
      className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--text-muted)] transition-colors duration-150 hover:border-accent hover:bg-black/5 hover:text-accent dark:hover:bg-white/10"
    >
      <Search className="h-4 w-4" aria-hidden />
      <span>Tìm kiếm…</span>
      <kbd className="rounded border border-[var(--border)] px-1 text-[10px]">⌘K</kbd>
    </button>
  );
}
