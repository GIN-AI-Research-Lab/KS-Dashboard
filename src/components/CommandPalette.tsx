"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Sun, Monitor, Moon } from "lucide-react";
import { ACCENTS, DENSITIES, THEMES, setAccent, setDensity, setTheme } from "./appearance/prefs";
import { useT } from "@/i18n/I18nProvider";

type Item = {
  label: string;
  sub?: string;
  href?: string;
  group: string;
  icon?: ReactNode;
  onSelect?: () => void;
};

const THEME_ICONS: Record<string, ReactNode> = {
  light: <Sun className="h-4 w-4" aria-hidden />,
  system: <Monitor className="h-4 w-4" aria-hidden />,
  dark: <Moon className="h-4 w-4" aria-hidden />,
};

// Navigable pages, by i18n label key (translated at render time).
const PAGE_LINKS: { labelKey: string; href: string }[] = [
  { labelKey: "nav.overview", href: "/" },
  { labelKey: "nav.me", href: "/me" },
  { labelKey: "nav.rankings", href: "/rankings" },
  { labelKey: "nav.models", href: "/models" },
  { labelKey: "nav.tools", href: "/tools" },
  { labelKey: "nav.adoption", href: "/adoption" },
  { labelKey: "nav.roi", href: "/roi" },
  { labelKey: "nav.insights", href: "/insights" },
  { labelKey: "nav.sessions", href: "/sessions" },
  { labelKey: "nav.library", href: "/library" },
  { labelKey: "chrome.libraryMe", href: "/library/me" },
  { labelKey: "nav.live", href: "/live" },
  { labelKey: "nav.departments", href: "/departments" },
  { labelKey: "nav.integrate", href: "/integrate" },
  { labelKey: "nav.admin", href: "/admin" },
];

export function CommandPalette() {
  const router = useRouter();
  const t = useT();
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
          ...d.users.map((u: { id: string; name: string; email: string }) => ({ label: u.name, sub: u.email, href: `/users/${u.id}`, group: t("chrome.groupUser") })),
          ...d.departments.map((x: { id: string; name: string }) => ({ label: x.name, href: `/departments/${x.id}`, group: t("chrome.groupDepartment") })),
          ...d.sessions.map((s: { id: string; projectLabel: string | null; note: string | null }) => ({
            label: s.projectLabel ?? "—",
            sub: s.note ?? undefined,
            href: `/sessions/${s.id}`,
            group: t("chrome.groupSession"),
          })),
        ];
        setRemote(items);
        setActive(0);
      } catch {
        // ignore
      }
    }, 200);
    return () => clearTimeout(id);
  }, [q, open, t]);

  // Local (translated) entries: pages + appearance quick-actions.
  const local = useMemo<Item[]>(() => {
    const pages: Item[] = PAGE_LINKS.map((p) => ({ label: t(p.labelKey), href: p.href, group: t("chrome.groupPage") }));
    const appearance: Item[] = [
      ...THEMES.map((th) => ({
        label: `${t("chrome.appearance")}: ${th.label}`,
        group: t("chrome.appearance"),
        icon: THEME_ICONS[th.key],
        onSelect: () => setTheme(th.key),
      })),
      ...ACCENTS.map((a) => ({
        label: `${t("chrome.accent")}: ${a.label}`,
        group: t("chrome.appearance"),
        icon: (
          <span
            className="h-3 w-3 rounded-full ring-1 ring-black/10 dark:ring-white/15"
            style={{ backgroundColor: a.color }}
            aria-hidden
          />
        ),
        onSelect: () => setAccent(a.key),
      })),
      ...DENSITIES.map((d) => ({
        label: `${t("chrome.density")}: ${d.label}`,
        group: t("chrome.appearance"),
        onSelect: () => setDensity(d.key),
      })),
    ];
    return [...pages, ...appearance];
  }, [t]);

  const items = useMemo(() => {
    const term = q.trim().toLowerCase();
    const filtered = term ? local.filter((p) => p.label.toLowerCase().includes(term)) : local;
    return [...filtered, ...remote];
  }, [q, local, remote]);

  function go(item: Item | undefined) {
    if (!item) return;
    if (item.onSelect) {
      item.onSelect();
      setOpen(false);
      return;
    }
    if (item.href) {
      setOpen(false);
      router.push(item.href);
    }
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
          placeholder={t("chrome.palettePlaceholder")}
          className="w-full border-b border-[var(--border)] bg-transparent px-4 py-3 text-sm outline-none"
        />
        <div className="max-h-[50vh] overflow-y-auto py-1">
          {items.length === 0 && <div className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">{t("chrome.paletteNoResults")}</div>}
          {items.map((item, i) => (
            <button
              key={`${item.group}-${item.label}-${i}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(item)}
              className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm transition-colors duration-150 ${
                i === active ? "bg-accent/10 text-accent" : "hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >
              <span className="flex min-w-0 flex-1 items-center gap-2.5 truncate">
                {item.icon && <span className="flex h-4 w-4 shrink-0 items-center justify-center">{item.icon}</span>}
                <span className="min-w-0 flex-1 truncate">
                  {item.label}
                  {item.sub && <span className="ml-2 text-xs text-[var(--text-muted)]">{item.sub}</span>}
                </span>
              </span>
              <span className="shrink-0 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{item.group}</span>
            </button>
          ))}
        </div>
        <div className="border-t border-[var(--border)] px-4 py-2 text-[11px] text-[var(--text-muted)]">
          {t("chrome.paletteHints")}
        </div>
      </div>
    </div>
  );
}
