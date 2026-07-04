"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Sun, Moon, Monitor, type LucideIcon } from "lucide-react";

type Pref = "light" | "system" | "dark";

function resolve(pref: Pref): "light" | "dark" {
  if (pref === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return pref;
}

function readPref(): Pref {
  return (localStorage.getItem("theme") as Pref | null) ?? "system";
}

// External store: the theme preference lives in localStorage. Subscribe to our
// own "themechange" event (fired on toggle) and cross-tab "storage" events.
function subscribe(onChange: () => void) {
  window.addEventListener("themechange", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("themechange", onChange);
    window.removeEventListener("storage", onChange);
  };
}

const OPTIONS: { key: Pref; Icon: LucideIcon; label: string }[] = [
  { key: "light", Icon: Sun, label: "Sáng" },
  { key: "system", Icon: Monitor, label: "Theo hệ thống" },
  { key: "dark", Icon: Moon, label: "Tối" },
];

export function ThemeToggle() {
  const pref = useSyncExternalStore<Pref>(subscribe, readPref, () => "system");

  // Re-resolve the DOM attribute when the OS scheme changes while in "system".
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (readPref() === "system") {
        document.documentElement.setAttribute("data-theme", mq.matches ? "dark" : "light");
      }
    };
    mq.addEventListener("change", onSystemChange);
    return () => mq.removeEventListener("change", onSystemChange);
  }, []);

  // Reflect preference changes (incl. cross-tab) onto <html> in this tab.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolve(pref));
  }, [pref]);

  function choose(next: Pref) {
    localStorage.setItem("theme", next);
    document.documentElement.setAttribute("data-theme", resolve(next));
    window.dispatchEvent(new Event("themechange"));
  }

  return (
    <div
      role="radiogroup"
      aria-label="Chế độ hiển thị"
      className="flex items-center gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5"
    >
      {OPTIONS.map(({ key, Icon, label }) => {
        const active = pref === key;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => choose(key)}
            className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors duration-150 ${
              active
                ? "bg-accent/10 text-accent"
                : "text-[var(--text-muted)] hover:bg-black/[0.04] hover:text-[var(--text-primary)] dark:hover:bg-white/[0.06]"
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={active ? 2.25 : 2} />
          </button>
        );
      })}
    </div>
  );
}
