"use client";

import { useEffect, useRef, useState } from "react";
import { Palette, Sun, Monitor, Moon, type LucideIcon } from "lucide-react";
import {
  ACCENTS,
  DENSITIES,
  THEMES,
  usePref,
  setTheme,
  setAccent,
  setDensity,
} from "@/components/appearance/prefs";
import { useT } from "@/i18n/I18nProvider";

const THEME_ICONS: Record<string, LucideIcon> = { light: Sun, system: Monitor, dark: Moon };

export function AppearanceMenu() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const theme = usePref("theme", "system");
  const accent = usePref("accent", "blue");
  const density = usePref("density", "comfortable");

  // keep the DOM theme in sync with the OS scheme while on "system"
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if ((localStorage.getItem("theme") ?? "system") === "system") setTheme("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // close the popover on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={t("chrome.appearanceAria")}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
          open
            ? "border-accent bg-accent/10 text-accent"
            : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-black/[0.04] hover:text-[var(--text-primary)] dark:hover:bg-white/[0.06]"
        }`}
      >
        <Palette className="h-4 w-4" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3 shadow-[var(--shadow-md)]"
        >
          <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
            {t("chrome.appearance")}
          </div>
          <div className="mb-3 flex gap-1 rounded-lg border border-[var(--border)] p-0.5">
            {THEMES.map((th) => {
              const Icon = THEME_ICONS[th.key];
              const active = theme === th.key;
              const label = t(th.labelKey);
              return (
                <button
                  key={th.key}
                  type="button"
                  title={label}
                  aria-label={label}
                  aria-pressed={active}
                  onClick={() => setTheme(th.key)}
                  className={`flex flex-1 items-center justify-center rounded-md py-1.5 transition-colors ${
                    active ? "bg-accent/10 text-accent" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>

          <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
            {t("chrome.accent")}
          </div>
          <div className="mb-3 flex gap-2">
            {ACCENTS.map((a) => {
              const active = accent === a.key;
              return (
                <button
                  key={a.key}
                  type="button"
                  title={t(a.labelKey)}
                  aria-label={t(a.labelKey)}
                  aria-pressed={active}
                  onClick={() => setAccent(a.key)}
                  className="h-7 w-7 rounded-full transition-transform hover:scale-110"
                  style={{
                    background: a.color,
                    boxShadow: active
                      ? `0 0 0 2px var(--surface-raised), 0 0 0 4px ${a.color}`
                      : undefined,
                  }}
                />
              );
            })}
          </div>

          <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
            {t("chrome.density")}
          </div>
          <div className="flex gap-1 rounded-lg border border-[var(--border)] p-0.5">
            {DENSITIES.map((d) => {
              const active = density === d.key;
              return (
                <button
                  key={d.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setDensity(d.key)}
                  className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
                    active ? "bg-accent/10 text-accent" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {t(d.labelKey)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
