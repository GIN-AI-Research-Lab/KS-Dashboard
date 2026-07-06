"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { SORTS } from "@/lib/library";
import { useT } from "@/i18n/I18nProvider";

const KIND_KEYS = ["", "PROMPT", "SKILL"] as const;

const SORT_LABEL_KEY: Record<(typeof SORTS)[number], string> = {
  new: "library.sortNew",
  comments: "library.sortComments",
  reactions: "library.sortReactions",
  stars: "library.sortStars",
};

export function LibraryFilters() {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const kind = params.get("kind") ?? "";
  const sort = params.get("sort") ?? "new";
  const [q, setQ] = useState(params.get("q") ?? "");
  const KINDS = KIND_KEYS.map((key) => ({
    key,
    label: key === "" ? t("library.filterAll") : key === "PROMPT" ? "Prompt" : "Skill",
  }));

  function update(next: Record<string, string | null>) {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    router.push(`${pathname}?${p.toString()}`);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5">
          {KINDS.map((k) => (
            <button
              key={k.key}
              onClick={() => update({ kind: k.key || null })}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors duration-150 ${kind === k.key ? "bg-accent/10 text-accent" : "text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/10"}`}
            >
              {k.label}
            </button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); update({ q: q || null }); }} className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("library.searchPlaceholder")}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1.5 pl-8 pr-3 text-sm transition-colors duration-150 focus:border-accent"
          />
        </form>
      </div>
      <div className="inline-flex w-fit rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5">
        {SORTS.map((s) => (
          <button
            key={s}
            onClick={() => update({ sort: s === "new" ? null : s })}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors duration-150 ${sort === s ? "bg-accent/10 text-accent" : "text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/10"}`}
          >
            {t(SORT_LABEL_KEY[s])}
          </button>
        ))}
      </div>
    </div>
  );
}
