"use client";

export function SearchTrigger() {
  return (
    <button
      onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
      className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--text-muted)] hover:bg-black/5 dark:hover:bg-white/10"
    >
      <span aria-hidden>🔍</span>
      <span>Tìm kiếm…</span>
      <kbd className="rounded border border-[var(--border)] px-1 text-[10px]">⌘K</kbd>
    </button>
  );
}
