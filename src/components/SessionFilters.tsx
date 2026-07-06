"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";
import { Star } from "lucide-react";
import { getOutcomeLabel } from "@/lib/session-outcome";
import { useT } from "@/i18n/I18nProvider";

export function SessionFilters() {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const outcome = params.get("outcome") ?? "";
  const featured = params.get("featured") === "1";
  const [q, setQ] = useState(params.get("q") ?? "");
  const OUTCOME_LABEL = getOutcomeLabel(t);
  const OUTCOME_OPTS = [
    { key: "", label: t("sessionsPage.outcomeAll") },
    { key: "SOLVED", label: OUTCOME_LABEL.SOLVED },
    { key: "IN_PROGRESS", label: OUTCOME_LABEL.IN_PROGRESS },
    { key: "ABANDONED", label: OUTCOME_LABEL.ABANDONED },
  ];

  function update(next: Record<string, string | null>) {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    router.push(`${pathname}?${p.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5">
        {OUTCOME_OPTS.map((o) => (
          <button
            key={o.key}
            onClick={() => update({ outcome: o.key || null })}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-150 active:scale-95 ${
              outcome === o.key
                ? "bg-accent/10 text-accent"
                : "text-[var(--text-secondary)] hover:bg-black/5 hover:text-[var(--text-primary)] dark:hover:bg-white/10"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <button
        onClick={() => update({ featured: featured ? null : "1" })}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all duration-150 active:scale-95 ${
          featured
            ? "border-accent bg-accent/10 text-accent"
            : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-black/5 hover:text-[var(--text-primary)] dark:hover:bg-white/10"
        }`}
      >
        <Star className={`h-4 w-4 ${featured ? "fill-current" : ""}`} />
        {t("sessionsPage.featuredLabel")}
      </button>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          update({ q: q || null });
        }}
        className="min-w-[180px] flex-1"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("sessionsPage.searchPlaceholder")}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm transition-colors hover:border-[var(--border-strong)]"
        />
      </form>
    </div>
  );
}
