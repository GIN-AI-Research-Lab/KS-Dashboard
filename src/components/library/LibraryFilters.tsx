"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { SORTS } from "@/lib/library";

const KINDS = [
  { key: "", label: "Tất cả" },
  { key: "PROMPT", label: "Prompt" },
  { key: "SKILL", label: "Skill" },
];

export function LibraryFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const kind = params.get("kind") ?? "";
  const sort = params.get("sort") ?? "new";
  const [q, setQ] = useState(params.get("q") ?? "");

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
            placeholder="Tìm tiêu đề, nội dung, tag… (Enter)"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1.5 pl-8 pr-3 text-sm transition-colors duration-150 focus:border-accent"
          />
        </form>
      </div>
      <div className="inline-flex w-fit rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5">
        {SORTS.map((s) => (
          <button
            key={s.key}
            onClick={() => update({ sort: s.key === "new" ? null : s.key })}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors duration-150 ${sort === s.key ? "bg-accent/10 text-accent" : "text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/10"}`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
