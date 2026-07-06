"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, ChevronDown, Check } from "lucide-react";
import {
  REFRESH_OPTIONS,
  useRefreshInterval,
  setRefreshInterval,
} from "@/components/refresh/refreshPrefs";
import { useT } from "@/i18n/I18nProvider";

// Topbar control: a manual "refresh now" button plus a dropdown to opt into an
// auto-refresh interval. Default is OFF (manual only) to keep request volume low
// over the tunnel. The chosen interval is per-viewer (localStorage) and read by
// the headless <AutoRefresh /> mounted in the layout.
export function RefreshControl() {
  const router = useRouter();
  const t = useT();
  const intervalMs = useRefreshInterval();
  const [open, setOpen] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const active = REFRESH_OPTIONS.find((o) => o.ms === intervalMs && o.ms > 0);

  const refreshNow = () => {
    setSpinning(true);
    router.refresh();
    setTimeout(() => setSpinning(false), 600);
  };

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
    <div ref={ref} className="relative flex items-center">
      <div className="inline-flex h-9 items-stretch overflow-hidden rounded-lg border border-[var(--border)]">
        <button
          type="button"
          onClick={refreshNow}
          title={t("chrome.refreshNowTitle")}
          className="inline-flex items-center gap-1.5 px-2.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-black/[0.04] hover:text-accent dark:hover:bg-white/[0.06]"
        >
          <RefreshCw className={`h-4 w-4 ${spinning ? "animate-spin" : ""}`} aria-hidden />
          <span className="hidden sm:inline">{active ? `${t("chrome.autoPrefix")} · ${active.label}` : t("chrome.refresh")}</span>
        </button>
        <button
          type="button"
          aria-label={t("chrome.autoOptionsAria")}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className={`flex items-center border-l border-[var(--border)] px-1 transition-colors ${
            open || active
              ? "text-accent"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          }`}
        >
          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-1.5 shadow-[var(--shadow-md)]"
        >
          <div className="px-2 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
            {t("chrome.autoHeading")}
          </div>
          {REFRESH_OPTIONS.map((o) => {
            const isActive = o.ms === intervalMs;
            return (
              <button
                key={o.ms}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                onClick={() => {
                  setRefreshInterval(o.ms);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs transition-colors ${
                  isActive
                    ? "bg-accent/10 text-accent"
                    : "text-[var(--text-secondary)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                }`}
              >
                {o.label}
                {isActive && <Check className="h-3.5 w-3.5" aria-hidden />}
              </button>
            );
          })}
          <div className="mt-1 border-t border-[var(--border)] px-2 pt-1.5 text-[10px] leading-snug text-[var(--text-muted)]">
            {t("chrome.autoHint")}
          </div>
        </div>
      )}
    </div>
  );
}
