"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useT } from "@/i18n/I18nProvider";

const OPTION_KEYS = ["24h", "7d", "30d", "90d", "all"] as const;

export function RangeSelector({ defaultRange = "30d" }: { defaultRange?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const t = useT();
  const current = params.get("range") ?? defaultRange;

  function setRange(key: string) {
    const next = new URLSearchParams(params.toString());
    next.set("range", key);
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5">
      {OPTION_KEYS.map((key) => (
        <button
          key={key}
          onClick={() => setRange(key)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-150 active:scale-95 ${
            current === key
              ? "bg-accent/10 text-accent"
              : "text-[var(--text-secondary)] hover:bg-black/5 hover:text-[var(--text-primary)] dark:hover:bg-white/10"
          }`}
        >
          {t(`ranges.${key}`)}
        </button>
      ))}
    </div>
  );
}
