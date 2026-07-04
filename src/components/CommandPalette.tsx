"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Item = { label: string; sub?: string; href: string; group: string };

const PAGES: Item[] = [
  { label: "Tổng quan", href: "/", group: "Trang" },
  { label: "Cá nhân", href: "/me", group: "Trang" },
  { label: "Xếp hạng", href: "/rankings", group: "Trang" },
  { label: "Model", href: "/models", group: "Trang" },
  { label: "Công cụ", href: "/tools", group: "Trang" },
  { label: "Áp dụng", href: "/adoption", group: "Trang" },
  { label: "Hiệu quả & Chi phí", href: "/roi", group: "Trang" },
  { label: "Dự án", href: "/projects", group: "Trang" },
  { label: "Phân tích sâu", href: "/insights", group: "Trang" },
  { label: "Thư viện phiên", href: "/sessions", group: "Trang" },
  { label: "Thư viện (prompt & skill)", href: "/library", group: "Trang" },
  { label: "Thư viện của tôi", href: "/library/me", group: "Trang" },
  { label: "Phiên trực tuyến", href: "/live", group: "Trang" },
  { label: "Quản trị", href: "/admin", group: "Trang" },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [remote, setRemote] = useState<Item[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  function openPalette() {
    setQ("");
    setRemote([]);
    setActive(0);
    setOpen(true);
  }

  // Toggle with Cmd/Ctrl+K, close with Escape.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => {
          if (v) return false;
          openPalette();
          return true;
        });
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-command-palette", openPalette);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-command-palette", openPalette);
    };
  }, []);

  // Focus the input when the palette opens (no state updates here).
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Debounced remote search (state is only updated inside the async callback).
  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (!term) return;
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
        if (!res.ok) return;
        const d = await res.json();
        const items: Item[] = [
          ...d.users.map((u: { id: string; name: string; email: string }) => ({ label: u.name, sub: u.email, href: `/users/${u.id}`, group: "Người dùng" })),
          ...d.teams.map((t: { id: string; name: string }) => ({ label: t.name, href: `/teams/${t.id}`, group: "Nhóm" })),
          ...d.departments.map((x: { id: string; name: string }) => ({ label: x.name, href: `/departments/${x.id}`, group: "Bộ phận" })),
          ...d.sessions.map((s: { id: string; projectLabel: string | null; note: string | null }) => ({
            label: s.projectLabel ?? "(phiên)",
            sub: s.note ?? undefined,
            href: `/sessions/${s.id}`,
            group: "Phiên",
          })),
        ];
        setRemote(items);
        setActive(0);
      } catch {
        // ignore
      }
    }, 200);
    return () => clearTimeout(id);
  }, [q, open]);

  const items = useMemo(() => {
    const term = q.trim().toLowerCase();
    const pages = term ? PAGES.filter((p) => p.label.toLowerCase().includes(term)) : PAGES;
    return [...pages, ...remote];
  }, [q, remote]);

  function go(item: Item | undefined) {
    if (!item) return;
    setOpen(false);
    router.push(item.href);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[12vh]" onClick={() => setOpen(false)}>
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            const v = e.target.value;
            setQ(v);
            if (!v.trim()) setRemote([]);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, items.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              go(items[active]);
            }
          }}
          placeholder="Tìm trang, người dùng, nhóm, dự án, phiên…"
          className="w-full border-b border-[var(--border)] bg-transparent px-4 py-3 text-sm outline-none"
        />
        <div className="max-h-[50vh] overflow-y-auto py-1">
          {items.length === 0 && <div className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">Không có kết quả</div>}
          {items.map((item, i) => (
            <button
              key={`${item.href}-${i}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(item)}
              className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm transition-colors duration-150 ${
                i === active ? "bg-accent/10 text-accent" : "hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >
              <span className="min-w-0 flex-1 truncate">
                {item.label}
                {item.sub && <span className="ml-2 text-xs text-[var(--text-muted)]">{item.sub}</span>}
              </span>
              <span className="shrink-0 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{item.group}</span>
            </button>
          ))}
        </div>
        <div className="border-t border-[var(--border)] px-4 py-2 text-[11px] text-[var(--text-muted)]">
          ↑↓ di chuyển · ↵ mở · Esc đóng · ⌘/Ctrl+K bật tắt
        </div>
      </div>
    </div>
  );
}
