"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { LOCALES, type Locale } from "@/i18n/config";
import { Flag } from "@/components/Flag";
import { useI18n, useT } from "@/i18n/I18nProvider";

export function LanguageSwitcher() {
  const { locale } = useI18n();
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

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

  async function choose(next: Locale) {
    setOpen(false);
    if (next === locale) return;
    await fetch("/api/locale", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locale: next }),
    }).catch(() => {});
    // Re-render server components so the new dictionary + <html lang> take effect.
    startTransition(() => router.refresh());
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={t("language.select")}
        aria-expanded={open}
        disabled={pending}
        onClick={() => setOpen((v) => !v)}
        title={t(`language.${locale}`)}
        className={`flex h-9 items-center justify-center rounded-lg px-1 transition-colors ${
          open ? "bg-accent/10" : "hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
        }`}
      >
        <Flag code={locale} className="h-6 w-9" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-44 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-1.5 shadow-[var(--shadow-md)]"
        >
          <div className="px-2 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
            {t("language.label")}
          </div>
          {LOCALES.map((code) => {
            const active = code === locale;
            return (
              <button
                key={code}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => choose(code)}
                className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-accent/10 text-accent"
                    : "text-[var(--text-secondary)] hover:bg-black/[0.04] hover:text-[var(--text-primary)] dark:hover:bg-white/[0.06]"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Flag code={code} />
                  {t(`language.${code}`)}
                </span>
                {active && <Check className="h-4 w-4" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
